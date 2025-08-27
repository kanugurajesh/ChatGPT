import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { UserUploadedImage, GeneratedImage } from '@/lib/models/Image';
import { connectToMongoDB } from '@/lib/mongodb';
import { deleteFromCloudinary, bulkDeleteFromCloudinary } from '@/lib/cloudinary-server';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectToMongoDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'generated' | 'uploaded'
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');
    const search = searchParams.get('search');
    const chatId = searchParams.get('chatId');

    let query: any = { userId };
    let results: any[] = [];

    if (chatId) {
      query.chatId = chatId;
    }

    if (type === 'generated') {
      // Query AI generated images
      let generatedQuery = GeneratedImage.find(query);
      
      if (search) {
        // Text search on prompts
        generatedQuery = GeneratedImage.find({
          ...query,
          $text: { $search: search }
        }).sort({ score: { $meta: 'textScore' }, generatedAt: -1 });
      } else {
        generatedQuery = generatedQuery.sort({ generatedAt: -1 });
      }

      results = await generatedQuery
        .limit(limit)
        .skip(skip)
        .lean()
        .exec();

      // Add type identifier
      results = results.map(image => ({ ...image, type: 'generated' }));

    } else if (type === 'uploaded') {
      // Query user uploaded images
      let uploadedQuery = UserUploadedImage.find(query);
      
      if (search) {
        // Search by filename
        uploadedQuery = UserUploadedImage.find({
          ...query,
          $or: [
            { fileName: new RegExp(search, 'i') },
            { originalName: new RegExp(search, 'i') }
          ]
        });
      }

      results = await uploadedQuery
        .sort({ uploadedAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean()
        .exec();

      // Add type identifier
      results = results.map(image => ({ ...image, type: 'uploaded' }));

    } else {
      // Query both types
      const [generatedImages, uploadedImages] = await Promise.all([
        GeneratedImage.find(query)
          .sort({ generatedAt: -1 })
          .limit(Math.ceil(limit / 2))
          .skip(Math.floor(skip / 2))
          .lean()
          .exec(),
        UserUploadedImage.find(query)
          .sort({ uploadedAt: -1 })
          .limit(Math.ceil(limit / 2))
          .skip(Math.floor(skip / 2))
          .lean()
          .exec()
      ]);

      // Combine and sort by date
      const allImages = [
        ...generatedImages.map(img => ({ ...img, type: 'generated', sortDate: img.generatedAt })),
        ...uploadedImages.map(img => ({ ...img, type: 'uploaded', sortDate: img.uploadedAt }))
      ];

      results = allImages.sort((a, b) => 
        new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime()
      );
    }

    // Get counts for pagination
    const totalGenerated = await GeneratedImage.countDocuments({ userId, ...(chatId && { chatId }) });
    const totalUploaded = await UserUploadedImage.countDocuments({ userId, ...(chatId && { chatId }) });

    return NextResponse.json({
      success: true,
      images: results,
      pagination: {
        total: type === 'generated' ? totalGenerated : type === 'uploaded' ? totalUploaded : totalGenerated + totalUploaded,
        limit,
        skip,
        hasMore: results.length === limit
      },
      counts: {
        generated: totalGenerated,
        uploaded: totalUploaded,
        total: totalGenerated + totalUploaded
      }
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to fetch images',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectToMongoDB();

    const body = await req.json();
    const { imageIds, type, bulkDelete = false } = body;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json({ error: 'No image IDs provided' }, { status: 400 });
    }

    if (!type || (type !== 'generated' && type !== 'uploaded')) {
      return NextResponse.json({ error: 'Invalid type. Must be "generated" or "uploaded"' }, { status: 400 });
    }

    let deletedImages: any[] = [];
    let publicIdsToDelete: string[] = [];

    if (type === 'generated') {
      // Find and delete generated images
      const images = await GeneratedImage.find({
        id: { $in: imageIds },
        userId: userId
      }).lean();

      if (images.length === 0) {
        return NextResponse.json({ error: 'No images found to delete' }, { status: 404 });
      }

      publicIdsToDelete = images.map(img => img.cloudinaryPublicId);
      
      await GeneratedImage.deleteMany({
        id: { $in: imageIds },
        userId: userId
      });

      deletedImages = images;

    } else if (type === 'uploaded') {
      // Find and delete uploaded images
      const images = await UserUploadedImage.find({
        id: { $in: imageIds },
        userId: userId
      }).lean();

      if (images.length === 0) {
        return NextResponse.json({ error: 'No images found to delete' }, { status: 404 });
      }

      publicIdsToDelete = images.map(img => img.cloudinaryPublicId);
      
      await UserUploadedImage.deleteMany({
        id: { $in: imageIds },
        userId: userId
      });

      deletedImages = images;
    }

    // Delete from Cloudinary
    let cloudinaryResult;
    if (bulkDelete && publicIdsToDelete.length > 1) {
      cloudinaryResult = await bulkDeleteFromCloudinary(publicIdsToDelete);
    } else {
      // Delete one by one
      const deletePromises = publicIdsToDelete.map(publicId => deleteFromCloudinary(publicId));
      const results = await Promise.all(deletePromises);
      
      cloudinaryResult = {
        deleted: publicIdsToDelete.filter((_, index) => results[index]),
        failed: publicIdsToDelete.filter((_, index) => !results[index])
      };
    }

    return NextResponse.json({
      success: true,
      deleted: {
        database: deletedImages.length,
        cloudinary: cloudinaryResult.deleted.length
      },
      failed: {
        cloudinary: cloudinaryResult.failed.length,
        publicIds: cloudinaryResult.failed
      },
      message: `Successfully deleted ${deletedImages.length} images`
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to delete images',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}