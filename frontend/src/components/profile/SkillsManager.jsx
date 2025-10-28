import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useAddSkill, useUpdateSkill, useRemoveSkill, useSkillCategories } from '../../hooks/useApi';
import { SKILL_LEVELS, SKILL_LEVEL_LABELS } from '../../utils/constants';
import { validateRequired, validateMaxLength } from '../../utils/validation';
import Button from '../common/Button';
import Input from '../common/Input';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

function SkillsManager() {
    const { user, updateUser } = useAuth();
    const [isAddingSkill, setIsAddingSkill] = useState(false);
    const [editingSkill, setEditingSkill] = useState(null);
    const [skillsWanted, setSkillsWanted] = useState(user?.skillsWanted || []);
    const [newSkillWanted, setNewSkillWanted] = useState('');

    const addSkillMutation = useAddSkill();
    const updateSkillMutation = useUpdateSkill();
    const removeSkillMutation = useRemoveSkill();
    const { data: skillCategories, isLoading: categoriesLoading } = useSkillCategories();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        setValue,
        watch,
    } = useForm({
        defaultValues: {
            name: '',
            category: '',
            level: SKILL_LEVELS.BEGINNER,
            description: '',
        },
        mode: 'onBlur',
    });

    const handleAddSkill = () => {
        setIsAddingSkill(true);
        setEditingSkill(null);
        reset();
    };

    const handleEditSkill = (skill) => {
        setEditingSkill(skill);
        setIsAddingSkill(true);
        setValue('name', skill.name);
        setValue('category', skill.category);
        setValue('level', skill.level);
        setValue('description', skill.description || '');
    };

    const handleCancelEdit = () => {
        setIsAddingSkill(false);
        setEditingSkill(null);
        reset();
    };

    const onSubmitSkill = async (data) => {
        try {
            if (editingSkill) {
                await updateSkillMutation.mutateAsync({
                    skillId: editingSkill._id,
                    skillData: data,
                });
            } else {
                await addSkillMutation.mutateAsync(data);
            }

            setIsAddingSkill(false);
            setEditingSkill(null);
            reset();
        } catch (error) {
            // Error handling is done by the hooks
        }
    };

    const handleRemoveSkill = async (skillId) => {
        if (window.confirm('Are you sure you want to remove this skill?')) {
            try {
                await removeSkillMutation.mutateAsync(skillId);
            } catch (error) {
                // Error handling is done by the hooks
            }
        }
    };

    const handleAddSkillWanted = () => {
        if (!newSkillWanted.trim()) return;

        if (skillsWanted.includes(newSkillWanted.trim())) {
            toast.error('This skill is already in your list');
            return;
        }

        const updatedSkills = [...skillsWanted, newSkillWanted.trim()];
        setSkillsWanted(updatedSkills);
        setNewSkillWanted('');

        // Update user context immediately for better UX
        updateUser({ ...user, skillsWanted: updatedSkills });
    };

    const handleRemoveSkillWanted = (skillToRemove) => {
        const updatedSkills = skillsWanted.filter(skill => skill !== skillToRemove);
        setSkillsWanted(updatedSkills);

        // Update user context immediately for better UX
        updateUser({ ...user, skillsWanted: updatedSkills });
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddSkillWanted();
        }
    };

    if (categoriesLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Skills I Offer */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Skills I Offer</h2>
                    {!isAddingSkill && (
                        <Button onClick={handleAddSkill} size="sm">
                            Add Skill
                        </Button>
                    )}
                </div>

                {/* Add/Edit Skill Form */}
                {isAddingSkill && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            {editingSkill ? 'Edit Skill' : 'Add New Skill'}
                        </h3>

                        <form onSubmit={handleSubmit(onSubmitSkill)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Skill Name"
                                    required
                                    placeholder="e.g., JavaScript, Guitar, Photography"
                                    error={errors.name?.message}
                                    {...register('name', {
                                        required: 'Skill name is required',
                                        validate: (value) => validateMaxLength(value, 100, 'Skill name'),
                                    })}
                                />

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Category <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        {...register('category', {
                                            required: 'Category is required',
                                        })}
                                    >
                                        <option value="">Select a category</option>
                                        {skillCategories?.map((category) => (
                                            <option key={category} value={category}>
                                                {category}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.category && (
                                        <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Skill Level <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    {...register('level', {
                                        required: 'Skill level is required',
                                    })}
                                >
                                    {Object.entries(SKILL_LEVEL_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                                {errors.level && (
                                    <p className="mt-1 text-sm text-red-600">{errors.level.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Describe your experience and what you can teach..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                    {...register('description', {
                                        validate: (value) => validateMaxLength(value, 300, 'Description'),
                                    })}
                                />
                                {errors.description && (
                                    <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                                )}
                                <p className="mt-1 text-sm text-gray-500">
                                    {watch('description')?.length || 0}/300 characters
                                </p>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    loading={isSubmitting || addSkillMutation.isLoading || updateSkillMutation.isLoading}
                                    disabled={isSubmitting || addSkillMutation.isLoading || updateSkillMutation.isLoading}
                                >
                                    {editingSkill ? 'Update Skill' : 'Add Skill'}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Skills List */}
                {user?.skills && user.skills.length > 0 ? (
                    <div className="space-y-3">
                        {user.skills.map((skill, index) => (
                            <div key={skill._id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                        <h3 className="font-medium text-gray-900">{skill.name}</h3>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${skill.level === 'expert' ? 'bg-purple-100 text-purple-800' :
                                                skill.level === 'advanced' ? 'bg-blue-100 text-blue-800' :
                                                    skill.level === 'intermediate' ? 'bg-green-100 text-green-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {SKILL_LEVEL_LABELS[skill.level]}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">{skill.category}</p>
                                    {skill.description && (
                                        <p className="text-sm text-gray-500 mt-2">{skill.description}</p>
                                    )}
                                </div>

                                <div className="flex items-center space-x-2 ml-4">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditSkill(skill)}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveSkill(skill._id)}
                                        loading={removeSkillMutation.isLoading}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-500">No skills added yet</p>
                        <p className="text-sm text-gray-400">Add your first skill to get started</p>
                    </div>
                )}
            </div>

            {/* Skills I Want to Learn */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Skills I Want to Learn</h2>

                {/* Add Skill Input */}
                <div className="mb-6">
                    <div className="flex space-x-2">
                        <Input
                            placeholder="Enter a skill you want to learn..."
                            value={newSkillWanted}
                            onChange={(e) => setNewSkillWanted(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="flex-1"
                        />
                        <Button
                            onClick={handleAddSkillWanted}
                            disabled={!newSkillWanted.trim()}
                        >
                            Add
                        </Button>
                    </div>
                </div>

                {/* Skills Wanted List */}
                {skillsWanted.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {skillsWanted.map((skill, index) => (
                            <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                            >
                                {skill}
                                <button
                                    onClick={() => handleRemoveSkillWanted(skill)}
                                    className="ml-2 text-primary-600 hover:text-primary-800"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-500">No learning interests added yet</p>
                        <p className="text-sm text-gray-400">Add skills you want to learn</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SkillsManager;