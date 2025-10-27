import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authAPI, profileAPI, searchAPI, sessionAPI, reviewAPI, adminAPI } from '../utils/api';
import toast from 'react-hot-toast';

/**
 * Custom hooks for API operations using React Query
 */

// Auth hooks
export function useLogin() {
    return useMutation({
        mutationFn: authAPI.login,
        onError: (error) => {
            const message = error.response?.data?.message || 'Login failed';
            toast.error(message);
        },
    });
}

export function useRegister() {
    return useMutation({
        mutationFn: authAPI.register,
        onError: (error) => {
            const message = error.response?.data?.message || 'Registration failed';
            toast.error(message);
        },
    });
}

export function useVerifyOTP() {
    return useMutation({
        mutationFn: authAPI.verifyOTP,
        onError: (error) => {
            const message = error.response?.data?.message || 'OTP verification failed';
            toast.error(message);
        },
    });
}

export function useResendOTP() {
    return useMutation({
        mutationFn: authAPI.resendOTP,
        onSuccess: () => {
            toast.success('OTP sent successfully!');
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Failed to send OTP';
            toast.error(message);
        },
    });
}

// Profile hooks
export function useProfile() {
    return useQuery({
        queryKey: ['profile'],
        queryFn: () => profileAPI.getProfile().then(res => res.data),
        retry: 1,
    });
}

export function useUserProfile(userId) {
    return useQuery({
        queryKey: ['profile', userId],
        queryFn: () => profileAPI.getUserProfile(userId).then(res => res.data),
        enabled: !!userId,
        retry: 1,
    });
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: profileAPI.updateProfile,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            toast.success('Profile updated successfully!');
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Failed to update profile';
            toast.error(message);
        },
    });
}

export function useUploadAvatar() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: profileAPI.uploadAvatar,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            toast.success('Avatar updated successfully!');
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Failed to upload avatar';
            toast.error(message);
        },
    });
}

export function useAddSkill() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: profileAPI.addSkill,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['skills'] });
            toast.success('Skill added successfully!');
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Failed to add skill';
            toast.error(message);
        },
    });
}

export function useUpdateSkill() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ skillId, skillData }) => profileAPI.updateSkill(skillId, skillData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['skills'] });
            toast.success('Skill updated successfully!');
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Failed to update skill';
            toast.error(message);
        },
    });
}

export function useRemoveSkill() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: profileAPI.removeSkill,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['skills'] });
            toast.success('Skill removed successfully!');
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Failed to remove skill';
            toast.error(message);
        },
    });
}

// Search hooks
export function useSearchUsers(params) {
    return useQuery({
        queryKey: ['search', 'users', params],
        queryFn: () => searchAPI.searchUsers(params).then(res => res.data),
        enabled: !!params?.skill || !!params?.category,
        keepPreviousData: true,
    });
}

export function useSkillCategories() {
    return useQuery({
        queryKey: ['skillCategories'],
        queryFn: () => searchAPI.getSkillCategories().then(res => res.data),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useAvailableSkills(params) {
    return useQuery({
        queryKey: ['availableSkills', params],
        queryFn: () => searchAPI.getAvailableSkills(params).then(res => res.data),
        keepPreviousData: true,
    });
}

export function useTrendingSkills() {
    return useQuery({
        queryKey: ['trendingSkills'],
        queryFn: () => searchAPI.getTrendingSkills().then(res => res.data),
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
}

// Session hooks
export function useCreateSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: sessionAPI.createSession,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            toast.success('Session request sent successfully!');
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Failed to create session';
            toast.error(message);
        },
    });
}

export function useUserSessions(params) {
    return useQuery({
        queryKey: ['sessions', params],
        queryFn: () => sessionAPI.getUserSessions(params).then(res => res.data),
        keepPreviousData: true,
    });
}

export function useSession(sessionId) {
    return useQuery({
        queryKey: ['session', sessionId],
        queryFn: () => sessionAPI.getSession(sessionId).then(res => res.data),
        enabled: !!sessionId,
    });
}

export function useRespondToSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sessionId, response }) => sessionAPI.respondToSession(sessionId, response),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            queryClient.invalidateQueries({ queryKey: ['session', variables.sessionId] });
            const action = variables.response.action === 'accept' ? 'accepted' : 'rejected';
            toast.success(`Session ${action} successfully!`);
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Failed to respond to session';
            toast.error(message);
        },
    });
}

export function useCancelSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sessionId, reason }) => sessionAPI.cancelSession(sessionId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            toast.success('Session cancelled successfully!');
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Failed to cancel session';
            toast.error(message);
        },
    });
}

export function useCompleteSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sessionId, notes }) => sessionAPI.completeSession(sessionId, notes),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            toast.success('Session marked as completed!');
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Failed to complete session';
            toast.error(message);
        },
    });
}

export function useUpcomingSessions(params) {
    return useQuery({
        queryKey: ['upcomingSessions', params],
        queryFn: () => sessionAPI.getUpcomingSessions(params).then(res => res.data),
        refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    });
}

export function useSessionStats() {
    return useQuery({
        queryKey: ['sessionStats'],
        queryFn: () => sessionAPI.getSessionStats().then(res => res.data),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

// Review hooks
export function useSubmitReview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: reviewAPI.submitReview,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reviews'] });
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            toast.success('Review submitted successfully!');
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Failed to submit review';
            toast.error(message);
        },
    });
}

export function useUserReviews(userId, params) {
    return useQuery({
        queryKey: ['reviews', userId, params],
        queryFn: () => reviewAPI.getUserReviews(userId, params).then(res => res.data),
        enabled: !!userId,
        keepPreviousData: true,
    });
}

export function usePendingReviews() {
    return useQuery({
        queryKey: ['pendingReviews'],
        queryFn: () => reviewAPI.getPendingReviews().then(res => res.data),
    });
}

export function useUserRatingStats(userId) {
    return useQuery({
        queryKey: ['ratingStats', userId],
        queryFn: () => reviewAPI.getUserRatingStats(userId).then(res => res.data),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

// Admin hooks (only for admin users)
export function useAdminDashboardStats() {
    return useQuery({
        queryKey: ['adminDashboard'],
        queryFn: () => adminAPI.getDashboardStats().then(res => res.data),
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
}

export function useAdminUsers(params) {
    return useQuery({
        queryKey: ['adminUsers', params],
        queryFn: () => adminAPI.getUsers(params).then(res => res.data),
        keepPreviousData: true,
    });
}

export function useUpdateUserStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, status }) => adminAPI.updateUserStatus(userId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
            toast.success('User status updated successfully!');
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Failed to update user status';
            toast.error(message);
        },
    });
}