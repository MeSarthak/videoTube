import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { videoService } from '../services/videoService';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import { toast } from 'react-hot-toast';
import { 
  getErrorMessage,
  isValidFileType,
  isValidFileSize,
  formatFileSize
} from '../utils/helpers';
import { APP_CONFIG } from '../config/constants';

const VideoUpload = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video: null,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      // Validate file type
      if (!isValidFileType(file, APP_CONFIG.ALLOWED_VIDEO_TYPES)) {
        setErrors((prev) => ({ 
          ...prev, 
          video: 'Invalid file type. Only MP4, WebM, and OGG are allowed.' 
        }));
        return;
      }
      
      // Validate file size
      if (!isValidFileSize(file, APP_CONFIG.MAX_UPLOAD_SIZE)) {
        setErrors((prev) => ({ 
          ...prev, 
          video: `File size must be less than ${formatFileSize(APP_CONFIG.MAX_UPLOAD_SIZE)}.` 
        }));
        return;
      }
      
      setFormData((prev) => ({ ...prev, video: file }));
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      if (errors.video) {
        setErrors((prev) => ({ ...prev, video: '' }));
      }
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!formData.video) {
      newErrors.video = 'Video file is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setUploadProgress(0);

    try {
      const response = await videoService.uploadVideo(
        formData.video,
        formData.title,
        formData.description,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      toast.success('Video uploaded successfully!');
      navigate(`/watch/${response.data._id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Upload Video</h1>
        <p className="text-gray-600 mt-1">Share your content with the world</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Video Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Video File <span className="text-red-500">*</span>
            </label>
            
            {!formData.video ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors">
                <svg 
                  className="mx-auto h-12 w-12 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                  />
                </svg>
                <div className="mt-4">
                  <label htmlFor="video-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-blue-600 hover:text-blue-700">
                      Click to upload
                    </span>
                    <input
                      id="video-upload"
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    MP4, WebM or OGG (MAX. {formatFileSize(APP_CONFIG.MAX_UPLOAD_SIZE)})
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative">
                <video
                  src={previewUrl}
                  controls
                  className="w-full rounded-lg"
                  style={{ maxHeight: '400px' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, video: null }));
                    setPreviewUrl('');
                    URL.revokeObjectURL(previewUrl);
                  }}
                  className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <p className="mt-2 text-sm text-gray-600">
                  {formData.video.name} ({formatFileSize(formData.video.size)})
                </p>
              </div>
            )}
            
            {errors.video && (
              <p className="mt-1 text-sm text-red-500">{errors.video}</p>
            )}
          </div>

          {/* Title */}
          <Input
            label="Title"
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            error={errors.title}
            required
            placeholder="Enter video title"
            maxLength={100}
          />

          {/* Description */}
          <Textarea
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Tell viewers about your video"
            rows={5}
            maxLength={500}
          />

          {/* Upload Progress */}
          {loading && uploadProgress > 0 && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button 
              type="submit" 
              loading={loading}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Processing...' : 'Upload Video'}
            </Button>
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => navigate('/')}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VideoUpload;
