import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Progress } from '@shared';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  image?: string;
  component?: React.ReactNode;
}

interface OnboardingModalProps {
  steps: OnboardingStep[];
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  steps,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { user } = useAuthStore();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 bg-[#2f3136] rounded-lg shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <Progress
          value={progress}
          max={100}
          smartColor
          size="sm"
          className="rounded-none h-1"
        />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#202225]">
          <div>
            <h2 className="text-xl font-bold text-white">Welcome, {user?.first_name}!</h2>
            <p className="text-sm text-[#b9bbbe] mt-1">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
          <button
            onClick={handleSkip}
            className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#393c43] rounded-lg transition-colors"
            aria-label="Skip onboarding"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 min-h-[400px] flex flex-col items-center justify-center">
          {currentStepData.image && (
            <div className="mb-6">
              <img
                src={currentStepData.image}
                alt={currentStepData.title}
                className="w-64 h-64 object-contain"
              />
            </div>
          )}

          {currentStepData.component ? (
            currentStepData.component
          ) : (
            <>
              <h3 className="text-2xl font-bold text-white mb-4 text-center">
                {currentStepData.title}
              </h3>
              <p className="text-[#b9bbbe] text-center max-w-md">
                {currentStepData.description}
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[#202225]">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-[#b9bbbe] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-colors ${index === currentStep
                  ? 'bg-[#5865f2]'
                  : index < currentStep
                    ? 'bg-[#23a55a]'
                    : 'bg-[#393c43]'
                  }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-lg font-medium transition-colors"
          >
            {currentStep === steps.length - 1 ? (
              <>
                Complete
                <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

