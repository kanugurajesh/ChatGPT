import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { UserUploadedImage, GeneratedImage } from '@/lib/models/Image';
import { connectToMongoDB } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectToMongoDB();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30'; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get overall counts
    const [totalGenerated, totalUploaded, recentGenerated, recentUploaded] = await Promise.all([
      GeneratedImage.countDocuments({ userId }),
      UserUploadedImage.countDocuments({ userId }),
      GeneratedImage.countDocuments({ 
        userId, 
        generatedAt: { $gte: startDate } 
      }),
      UserUploadedImage.countDocuments({ 
        userId, 
        uploadedAt: { $gte: startDate } 
      })
    ]);

    // Get file type distribution for uploads
    const uploadStats = await UserUploadedImage.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$mimeType',
          count: { $sum: 1 },
          totalSize: { $sum: '$fileSize' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get generation statistics
    const generationStats = await GeneratedImage.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: {
            year: { $year: '$generatedAt' },
            month: { $month: '$generatedAt' },
            day: { $dayOfMonth: '$generatedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { 
        $sort: { 
          '_id.year': -1, 
          '_id.month': -1, 
          '_id.day': -1 
        } 
      },
      { $limit: 30 }
    ]);

    // Get most used prompts (top 10)
    const topPrompts = await GeneratedImage.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$prompt',
          count: { $sum: 1 },
          lastUsed: { $max: '$generatedAt' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Calculate total storage used
    const storageStats = await UserUploadedImage.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$fileSize' },
          averageSize: { $avg: '$fileSize' },
          maxSize: { $max: '$fileSize' },
          minSize: { $min: '$fileSize' }
        }
      }
    ]);

    const totalStorageUsed = storageStats[0]?.totalSize || 0;
    const averageFileSize = storageStats[0]?.averageSize || 0;

    return NextResponse.json({
      success: true,
      stats: {
        overview: {
          totalGenerated,
          totalUploaded,
          totalImages: totalGenerated + totalUploaded,
          recentGenerated,
          recentUploaded,
          period: parseInt(period)
        },
        storage: {
          totalUsed: totalStorageUsed,
          averageFileSize: Math.round(averageFileSize),
          maxFileSize: storageStats[0]?.maxSize || 0,
          minFileSize: storageStats[0]?.minSize || 0,
          formattedTotalUsed: formatBytes(totalStorageUsed)
        },
        uploadDistribution: uploadStats.map(stat => ({
          mimeType: stat._id,
          count: stat.count,
          totalSize: stat.totalSize,
          averageSize: Math.round(stat.totalSize / stat.count),
          formattedTotalSize: formatBytes(stat.totalSize)
        })),
        generationActivity: generationStats.map(stat => ({
          date: `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}-${String(stat._id.day).padStart(2, '0')}`,
          count: stat.count
        })),
        topPrompts: topPrompts.map(prompt => ({
          prompt: prompt._id,
          count: prompt.count,
          lastUsed: prompt.lastUsed
        }))
      }
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to fetch statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}