import React from 'react';
import { Button, Modal } from '@shared/frontend';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { FileText, Bug, Rocket, UserCheck } from 'lucide-react';

export interface CardTemplate {
    name: string;
    icon: React.ReactNode;
    description: string;
    templateContent: string;
    checklists: string[];
}

const TEMPLATES: CardTemplate[] = [
    {
        name: "Bug Report",
        icon: <Bug className="h-5 w-5 text-red-500" />,
        description: "Standard template for reporting bugs.",
        templateContent: "**Description:**\n\n**Steps to Reproduce:**\n1.\n2.\n3.\n\n**Expected Behavior:**\n\n**Actual Behavior:**\n\n**Environment:**\n(Browser, OS, App Version)",
        checklists: ["Verify reproduction steps", "Check console logs", "Assign priority"]
    },
    {
        name: "Feature Request",
        icon: <Rocket className="h-5 w-5 text-blue-500" />,
        description: "Blueprint for proposing new features.",
        templateContent: "**User Story:**\nAs a [role], I want [feature] so that [benefit].\n\n**Acceptance Criteria:**\n- \n- \n\n**Additional Context:**\n",
        checklists: ["Design mockups attached", "Edge cases considered", "Technical feasibility reviewed"]
    },
    {
        name: "User Story",
        icon: <UserCheck className="h-5 w-5 text-green-500" />,
        description: "Standard agile user story format.",
        templateContent: "**Description:**\n\n**Business Value:**\n\n**Dependencies:**\n",
        checklists: ["QA plan defined", "Documentation updated"]
    },
    {
        name: "Blank Details",
        icon: <FileText className="h-5 w-5 text-gray-500" />,
        description: "Standard structural breakdown.",
        templateContent: "## Overview\n\n## Objectives\n\n## Action Items",
        checklists: []
    }
];

interface CardTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (template: CardTemplate) => void;
}

export default function CardTemplateModal({ isOpen, onClose, onApply }: CardTemplateModalProps) {
    const { theme } = useTheme();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Apply Card Template" theme={theme}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {TEMPLATES.map((template, idx) => (
                    <div
                        key={idx}
                        className="p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all duration-200"
                        style={{
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border
                        }}
                        onClick={() => onApply(template)}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
                                {template.icon}
                            </div>
                            <h3 className="font-semibold text-lg" style={{ color: theme.colors.text }}>{template.name}</h3>
                        </div>
                        <p className="text-sm" style={{ color: theme.colors.textSecondary }}>{template.description}</p>
                    </div>
                ))}
            </div>
            <div className="mt-6 flex justify-end">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
            </div>
        </Modal>
    );
}
