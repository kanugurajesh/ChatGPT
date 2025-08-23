"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Download, 
  Trash2, 
  Image as ImageIcon, 
  FileText, 
  Calendar,
  Filter,
  Grid3x3,
  List,
  X,
  Eye,
  ExternalLink,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';
import { getThumbnailUrl, getPreviewUrl } from '@/lib/cloudinary-client';

interface ImageItem {
  id: string;
  type: 'generated' | 'uploaded';
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  // Generated image fields
  prompt?: string;
  generatedAt?: string;
  generationSettings?: any;
  // Uploaded image fields
  fileName?: string;
  originalName?: string;
  uploadedAt?: string;
  fileSize?: number;
  mimeType?: string;
  // Common fields
  chatId?: string;
  messageId?: string;
  metadata?: any;
}

interface ImageStats {
  overview: {
    totalGenerated: number;
    totalUploaded: number;
    totalImages: number;
    recentGenerated: number;
    recentUploaded: number;
  };
  storage: {
    totalUsed: number;
    formattedTotalUsed: string;
    averageFileSize: number;
  };
}

interface ImageGalleryProps {
  onClose: () => void;
}

export function ImageGallery({ onClose }: ImageGalleryProps) {
  const { user, isSignedIn } = useUser();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [stats, setStats] = useState<ImageStats | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchImages = useCallback(async (reset = false) => {
    if (!isSignedIn) return;

    try {
      setLoading(true);
      const currentPage = reset ? 0 : page;
      const params = new URLSearchParams({
        limit: '20',
        skip: (currentPage * 20).toString(),
      });

      if (selectedTab !== 'all') {
        params.set('type', selectedTab);
      }

      if (searchTerm) {
        params.set('search', searchTerm);
      }

      const response = await fetch(`/api/images/gallery?${params}`);
      const data = await response.json();

      if (data.success) {
        if (reset) {
          setImages(data.images);
          setPage(1);
        } else {
          setImages(prev => [...prev, ...data.images]);
          setPage(prev => prev + 1);
        }
        setHasMore(data.pagination.hasMore);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, selectedTab, searchTerm, page]);

  const fetchStats = useCallback(async () => {
    if (!isSignedIn) return;

    try {
      const response = await fetch('/api/images/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [isSignedIn]);

  useEffect(() => {
    fetchImages(true);
    fetchStats();
  }, [selectedTab, searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(0);
  };

  const handleTabChange = (value: string) => {
    setSelectedTab(value);
    setPage(0);
    setSelectedImages([]);
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedImages.length === 0) return;

    try {
      // Group by type
      const generatedIds = images
        .filter(img => selectedImages.includes(img.id) && img.type === 'generated')
        .map(img => img.id);
      
      const uploadedIds = images
        .filter(img => selectedImages.includes(img.id) && img.type === 'uploaded')
        .map(img => img.id);

      const deletePromises = [];
      
      if (generatedIds.length > 0) {
        deletePromises.push(
          fetch('/api/images/gallery', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageIds: generatedIds,
              type: 'generated',
              bulkDelete: true
            })
          })
        );
      }

      if (uploadedIds.length > 0) {
        deletePromises.push(
          fetch('/api/images/gallery', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageIds: uploadedIds,
              type: 'uploaded',
              bulkDelete: true
            })
          })
        );
      }

      await Promise.all(deletePromises);
      
      // Refresh images
      setSelectedImages([]);
      fetchImages(true);
      fetchStats();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting images:', error);
    }
  };

  const downloadImage = async (image: ImageItem) => {
    try {
      const response = await fetch(image.cloudinaryUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.type === 'generated' 
        ? `generated-${image.id}.png`
        : image.fileName || `uploaded-${image.id}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!isSignedIn) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Sign in Required</h2>
          <p className="text-gray-400">Please sign in to view your image gallery.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#212121] text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-[#2f2f2f]">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">Image Gallery</h1>
          {stats && (
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>{stats.overview.totalImages} total images</span>
              <span>{stats.storage.formattedTotalUsed} used</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-6 border-b border-[#2f2f2f] space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search images..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-[#2f2f2f] border-gray-600 text-white placeholder-gray-400"
            />
          </div>
          {selectedImages.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">{selectedImages.length} selected</span>
              <Button
                onClick={() => setIsDeleteDialogOpen(true)}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>

        <Tabs value={selectedTab} onValueChange={handleTabChange}>
          <TabsList className="bg-[#2f2f2f]">
            <TabsTrigger value="all">All Images</TabsTrigger>
            <TabsTrigger value="generated">AI Generated</TabsTrigger>
            <TabsTrigger value="uploaded">Uploaded Files</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && images.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <ImageIcon className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No images found</h3>
            <p className="text-gray-400 text-center">
              {searchTerm 
                ? "Try adjusting your search terms" 
                : "Start by generating images or uploading files in your chats"}
            </p>
          </div>
        ) : (
          <>
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                : "space-y-4"
            )}>
              {images.map((image) => (
                <div
                  key={image.id}
                  className={cn(
                    "group relative rounded-lg overflow-hidden bg-[#2f2f2f] border border-gray-600 hover:border-gray-500 transition-colors",
                    viewMode === 'grid' ? "aspect-square" : "flex items-center p-4 h-24"
                  )}
                >
                  {/* Selection checkbox */}
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedImages.includes(image.id)}
                      onChange={() => toggleImageSelection(image.id)}
                      className="w-4 h-4 rounded border-gray-400 bg-transparent"
                    />
                  </div>

                  {viewMode === 'grid' ? (
                    <>
                      {/* Grid view */}
                      <div
                        className="w-full h-full cursor-pointer"
                        onClick={() => setSelectedImage(image)}
                      >
                        {image.mimeType?.startsWith('image/') || image.type === 'generated' ? (
                          <img
                            src={getThumbnailUrl(image.cloudinaryPublicId, 300)}
                            alt={image.type === 'generated' ? image.prompt : image.fileName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-end">
                        <div className="w-full p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {image.type === 'generated' 
                                  ? image.prompt?.slice(0, 30) + (image.prompt && image.prompt.length > 30 ? '...' : '')
                                  : image.fileName}
                              </p>
                              <p className="text-xs text-gray-300">
                                {formatDate(image.type === 'generated' ? image.generatedAt! : image.uploadedAt!)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadImage(image);
                                }}
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* List view */}
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-16 h-16 rounded overflow-hidden bg-[#404040] flex-shrink-0">
                          {image.mimeType?.startsWith('image/') || image.type === 'generated' ? (
                            <img
                              src={getThumbnailUrl(image.cloudinaryPublicId, 64)}
                              alt={image.type === 'generated' ? image.prompt : image.fileName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white truncate">
                            {image.type === 'generated' ? image.prompt : image.fileName}
                          </h3>
                          <div className="flex items-center gap-4 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {image.type === 'generated' ? 'AI Generated' : 'Uploaded'}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {formatDate(image.type === 'generated' ? image.generatedAt! : image.uploadedAt!)}
                            </span>
                            {image.fileSize && (
                              <span className="text-xs text-gray-400">
                                {formatFileSize(image.fileSize)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => setSelectedImage(image)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => downloadImage(image)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  onClick={() => fetchImages(false)}
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Image Preview Dialog */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] bg-[#2f2f2f] border-gray-600">
            <DialogHeader>
              <DialogTitle className="text-white">
                {selectedImage.type === 'generated' ? selectedImage.prompt : selectedImage.fileName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-center">
                {selectedImage.mimeType?.startsWith('image/') || selectedImage.type === 'generated' ? (
                  <img
                    src={getPreviewUrl(selectedImage.cloudinaryPublicId, 800)}
                    alt={selectedImage.type === 'generated' ? selectedImage.prompt : selectedImage.fileName}
                    className="max-w-full max-h-96 object-contain rounded"
                  />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center bg-[#404040] rounded">
                    <FileText className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Type:</span>
                  <span className="ml-2 text-white">
                    {selectedImage.type === 'generated' ? 'AI Generated' : 'Uploaded File'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Date:</span>
                  <span className="ml-2 text-white">
                    {formatDate(selectedImage.type === 'generated' ? selectedImage.generatedAt! : selectedImage.uploadedAt!)}
                  </span>
                </div>
                {selectedImage.fileSize && (
                  <div>
                    <span className="text-gray-400">Size:</span>
                    <span className="ml-2 text-white">{formatFileSize(selectedImage.fileSize)}</span>
                  </div>
                )}
                {selectedImage.mimeType && (
                  <div>
                    <span className="text-gray-400">Format:</span>
                    <span className="ml-2 text-white">{selectedImage.mimeType}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => downloadImage(selectedImage)}
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={() => window.open(selectedImage.cloudinaryUrl, '_blank')}
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Original
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-[#2f2f2f] border-gray-600">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Images</DialogTitle>
          </DialogHeader>
          <p className="text-gray-400">
            Are you sure you want to delete {selectedImages.length} image(s)? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setIsDeleteDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteSelected}
              variant="destructive"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}