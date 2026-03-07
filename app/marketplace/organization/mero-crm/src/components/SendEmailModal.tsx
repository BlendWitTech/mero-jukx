import React, { useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Card, Button, Input, Modal } from '@shared';
import { Send, X, Mail, MessageSquare, User } from 'lucide-react';

interface SendEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (data: { to: string; subject: string; message: string }) => Promise<void>;
    initialData: {
        to: string;
        subject: string;
        message: string;
    };
    title: string;
}

export default function SendEmailModal({ isOpen, onClose, onSend, initialData, title }: SendEmailModalProps) {
    const { theme } = useTheme();
    const [data, setData] = useState(initialData);
    const [sending, setSending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSending(true);
            await onSend(data);
            onClose();
        } catch (error) {
            // Error handling should be done by the parent (toast)
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-6 flex flex-col pt-2">
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold opacity-60 ml-1">Recipient Email</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 opacity-40 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
                            <input
                                type="email"
                                value={data.to}
                                onChange={(e) => setData({ ...data, to: e.target.value })}
                                className="w-full h-12 bg-black/5 dark:bg-white/5 border-none rounded-2xl pl-12 pr-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                                placeholder="client@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-bold opacity-60 ml-1">Subject</label>
                        <div className="relative group">
                            <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 opacity-40 group-focus-within:opacity-100 group-focus-within:text-primary transition-all" />
                            <input
                                type="text"
                                value={data.subject}
                                onChange={(e) => setData({ ...data, subject: e.target.value })}
                                className="w-full h-12 bg-black/5 dark:bg-white/5 border-none rounded-2xl pl-12 pr-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                                placeholder="Email Subject"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-bold opacity-60 ml-1">Message (Optional)</label>
                        <textarea
                            value={data.message}
                            onChange={(e) => setData({ ...data, message: e.target.value })}
                            className="w-full h-32 bg-black/5 dark:bg-white/5 border-none rounded-2xl p-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium resize-none"
                            placeholder="Add a personal message to the client..."
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        className="flex-1 h-12 rounded-2xl font-bold"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        loading={sending}
                        className="flex-1 h-12 rounded-2xl font-bold bg-primary hover:primary group shadow-lg shadow-primary/20"
                    >
                        <Send className="h-4 w-4 mr-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        Send Now
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
