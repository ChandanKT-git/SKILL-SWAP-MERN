import React from 'react';
import SkillsManager from '../components/profile/SkillsManager';

function SkillsManagerPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Manage Skills</h1>
                    <p className="mt-2 text-gray-600">
                        Add and manage the skills you offer and want to learn
                    </p>
                </div>
                <SkillsManager />
            </div>
        </div>
    );
}

export default SkillsManagerPage;