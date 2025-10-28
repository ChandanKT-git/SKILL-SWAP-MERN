import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUpdateProfile, useUploadAvatar } from '../../hooks/useApi';
import { validateRequired, validateMaxLength } from '../../utils/validation';
import { validateFile, getInitials, getAvatarColor } from '../../utils/helpers';
import Button from '../common/Button';
import Input from '../common/Input';
import toast from 'react-hot-toast';

function ProfileEdit() {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const updateProfileMutation = useUpdateProfile();
    const uploadAvatarMutation = useUploadAvatar();
    const fileInputRef = useRef(null);

    const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
    const [selectedFile, setSelectedFile] = useState(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        watch,
    } = useForm({
        defaultValues: {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            bio: user?.bio || '',
            location: user?.location || '',
        },
        mode: 'onBlur',
    });

    const handleAvatarChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const validation = validateFile(file, {
            maxSize: 5 * 1024 * 1024, // 5MB
            allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        });

        if (!validation.isValid) {
            toast.error(validation.errors[0]);
            return;
        }

        setSelectedFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setAvatarPreview(e.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveAvatar = () => {
        setAvatarPreview(null);
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const onSubmit = async (data) => {
        try {
            // Upload avatar first if there's a new file
            if (selectedFile) {
                const formData = new FormData();
                formData.append('avatar', selectedFile);
                await uploadAvatarMutation.mutateAsync(formData);
            }

            // Update profile data
            const response = await updateProfileMutation.mutateAsync(data);

            if (response.data.success) {
                // Update user context
                updateUser(response.data.data);
                toast.success('Profile updated successfully!');
                navigate('/profile');
            }
        } catch (error) {
            // Error handling is done by the hooks
        }
    };

    const handleCancel = () => {
        navigate('/profile');
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
                    <Button variant="ghost" onClick={handleCancel}>
                        Cancel
                    </Button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center space-y-4">
                        <div className="relative">
                            {avatarPreview ? (
                                <img
                                    src={avatarPreview}
                                    alt="Avatar preview"
                                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                                />
                            ) : (
                                <div className={`w-24 h-24 rounded-full border-4 border-gray-200 ${getAvatarColor(user?.email)} flex items-center justify-center`}>
                                    <span className="text-white text-2xl font-bold">
                                        {getInitials(watch('firstName') || user?.firstName, watch('lastName') || user?.lastName)}
                                    </span>
                                </div>
                            )}

                            {avatarPreview && (
                                <button
                                    type="button"
                                    onClick={handleRemoveAvatar}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        <div className="flex space-x-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                            </Button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                        </div>

                        <p className="text-xs text-gray-500 text-center">
                            JPG, PNG or WebP. Max size 5MB.
                        </p>
                    </div>

                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="First Name"
                            required
                            error={errors.firstName?.message}
                            {...register('firstName', {
                                required: 'First name is required',
                                validate: (value) => validateMaxLength(value, 50, 'First name'),
                            })}
                        />

                        <Input
                            label="Last Name"
                            required
                            error={errors.lastName?.message}
                            {...register('lastName', {
                                required: 'Last name is required',
                                validate: (value) => validateMaxLength(value, 50, 'Last name'),
                            })}
                        />
                    </div>

                    <Input
                        label="Location"
                        placeholder="e.g., San Francisco, CA"
                        error={errors.location?.message}
                        {...register('location', {
                            validate: (value) => validateMaxLength(value, 100, 'Location'),
                        })}
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bio
                        </label>
                        <textarea
                            rows={4}
                            placeholder="Tell others about yourself, your interests, and what you're passionate about..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            {...register('bio', {
                                validate: (value) => validateMaxLength(value, 500, 'Bio'),
                            })}
                        />
                        {errors.bio && (
                            <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>
                        )}
                        <p className="mt-1 text-sm text-gray-500">
                            {watch('bio')?.length || 0}/500 characters
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            loading={isSubmitting || updateProfileMutation.isLoading || uploadAvatarMutation.isLoading}
                            disabled={isSubmitting || updateProfileMutation.isLoading || uploadAvatarMutation.isLoading}
                        >
                            Save Changes
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ProfileEdit;