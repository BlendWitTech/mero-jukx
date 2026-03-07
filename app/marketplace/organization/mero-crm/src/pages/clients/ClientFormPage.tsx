import React, { useEffect, useState } from 'react';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { useNavigate, useParams } from 'react-router-dom';
import { clientsApi, CreateClientDto, ClientContact } from '../../api/clients';
import { Card, Button, Input, Label, Textarea } from '@shared';
import { ArrowLeft, Save, Plus, Trash2, X } from 'lucide-react';
import { toast } from '@shared';
import { useAppContext } from '../../contexts/AppContext';

export default function ClientFormPage() {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { buildHref } = useAppContext();
    const { id } = useParams<{ id: string }>();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState<CreateClientDto>({
        name: '',
        category: 'CUSTOMER',
        email: '',
        phone: '',
        company: '',
        address: '',
        city: '',
        state: '',
        country: '',
        zipCode: '',
        notes: '',
        tags: [],
        customFields: {},
        contacts: [],
    });

    const [tagInput, setTagInput] = useState('');
    const [customFieldKey, setCustomFieldKey] = useState('');
    const [customFieldValue, setCustomFieldValue] = useState('');

    useEffect(() => {
        if (isEdit) {
            fetchClient();
        }
    }, [id]);

    const fetchClient = async () => {
        if (!id) return;

        try {
            setLoading(true);
            const client = await clientsApi.getClient(id);
            setFormData({
                name: client.name,
                category: client.category || 'CUSTOMER',
                email: client.email,
                phone: client.phone || '',
                company: client.company || '',
                address: client.address || '',
                city: client.city || '',
                state: client.state || '',
                country: client.country || '',
                zipCode: client.zipCode || '',
                notes: client.notes || '',
                tags: client.tags || [],
                customFields: client.custom_fields || {},
                // Fix: don't override the client contacts with empty array accidentally if they exist 
                // but omit nested relations initially if not fetched
                contacts: client.contacts || [],
            });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to fetch client');
            navigate(buildHref('/clients'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.email) {
            toast.error('Name and email are required');
            return;
        }

        try {
            setSubmitting(true);
            if (isEdit && id) {
                await clientsApi.updateClient(id, formData);
                toast.success('Client updated successfully');
            } else {
                await clientsApi.createClient(formData);
                toast.success('Client created successfully');
            }
            navigate(buildHref('/clients'));
        } catch (error: any) {
            toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} client`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleChange = (field: keyof CreateClientDto, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    // --- Tags Logic ---
    const addTag = (e?: React.KeyboardEvent) => {
        if (e && e.key !== 'Enter') return;
        if (e) e.preventDefault();

        if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
            handleChange('tags', [...(formData.tags || []), tagInput.trim()]);
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        handleChange('tags', (formData.tags || []).filter(t => t !== tagToRemove));
    };

    // --- Custom Fields Logic ---
    const addCustomField = () => {
        if (customFieldKey.trim() && customFieldValue.trim()) {
            setFormData(prev => ({
                ...prev,
                customFields: {
                    ...(prev.customFields || {}),
                    [customFieldKey.trim()]: customFieldValue.trim()
                }
            }));
            setCustomFieldKey('');
            setCustomFieldValue('');
        }
    };

    const removeCustomField = (keyToRemove: string) => {
        setFormData(prev => {
            const newFields = { ...prev.customFields };
            delete newFields[keyToRemove];
            return { ...prev, customFields: newFields };
        });
    };

    // --- Contacts Logic ---
    const addContact = () => {
        setFormData(prev => ({
            ...prev,
            contacts: [...(prev.contacts || []), { first_name: '', last_name: '', email: '', phone: '', job_title: '', is_primary: prev.contacts?.length === 0 }]
        }));
    };

    const updateContact = (index: number, field: keyof ClientContact, value: any) => {
        setFormData(prev => {
            const newContacts = [...(prev.contacts || [])];
            newContacts[index] = { ...newContacts[index], [field]: value };

            // If setting a contact as primary, un-primary others
            if (field === 'is_primary' && value === true) {
                newContacts.forEach((c, i) => {
                    if (i !== index) c.is_primary = false;
                });
            }

            return { ...prev, contacts: newContacts };
        });
    };

    const removeContact = (index: number) => {
        setFormData(prev => ({
            ...prev,
            contacts: (prev.contacts || []).filter((_, i) => i !== index)
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div
                        className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
                        style={{ borderColor: theme.colors.primary }}
                    ></div>
                    <p style={{ color: theme.colors.textSecondary }}>Loading client...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(buildHref('/clients'))}
                    className="p-2 rounded transition-colors"
                    style={{ color: theme.colors.textSecondary }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.border;
                        e.currentTarget.style.color = theme.colors.text;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = theme.colors.textSecondary;
                    }}
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: theme.colors.text }}>
                        {isEdit ? 'Edit Client' : 'New Client'}
                    </h1>
                    <p style={{ color: theme.colors.textSecondary }}>
                        {isEdit ? 'Update client information' : 'Add a new client to your CRM'}
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <Card className="p-6 space-y-6" style={{ backgroundColor: theme.colors.surface }}>
                    {/* Basic Information */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>
                            Basic Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="category">
                                    Category <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="category"
                                    value={formData.category}
                                    onChange={(e) => handleChange('category', e.target.value)}
                                    className="w-full h-10 px-3 py-2 rounded-md outline-none transition-shadow"
                                    style={{
                                        backgroundColor: theme.colors.surface,
                                        border: `1px solid ${theme.colors.border}`,
                                        color: theme.colors.text,
                                    }}
                                    required
                                >
                                    <option value="CUSTOMER">Customer</option>
                                    <option value="LEAD">Lead</option>
                                    <option value="VENDOR">Vendor</option>
                                    <option value="PARTNER">Partner</option>
                                </select>
                            </div>
                            <div>
                                <Label htmlFor="name">
                                    Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    placeholder="John Doe / Acme Corp"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="email">
                                    Email <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    placeholder="john@example.com"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>
                            <div>
                                <Label htmlFor="company">Company</Label>
                                <Input
                                    id="company"
                                    type="text"
                                    value={formData.company}
                                    onChange={(e) => handleChange('company', e.target.value)}
                                    placeholder="Acme Inc."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address Information */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>
                            Address Information
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <Label htmlFor="address">Street Address</Label>
                                <Input
                                    id="address"
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    placeholder="123 Main St"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="city">City</Label>
                                    <Input
                                        id="city"
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => handleChange('city', e.target.value)}
                                        placeholder="New York"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="state">State/Province</Label>
                                    <Input
                                        id="state"
                                        type="text"
                                        value={formData.state}
                                        onChange={(e) => handleChange('state', e.target.value)}
                                        placeholder="NY"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="country">Country</Label>
                                    <Input
                                        id="country"
                                        type="text"
                                        value={formData.country}
                                        onChange={(e) => handleChange('country', e.target.value)}
                                        placeholder="United States"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                                    <Input
                                        id="zipCode"
                                        type="text"
                                        value={formData.zipCode}
                                        onChange={(e) => handleChange('zipCode', e.target.value)}
                                        placeholder="10001"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tags & Custom Fields */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>
                            Categorization & Custom Data
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Tags Input */}
                            <div>
                                <Label>Tags</Label>
                                <div className="flex gap-2 mb-2">
                                    <Input
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={addTag}
                                        placeholder="Add a tag and press Enter"
                                    />
                                    <Button type="button" variant="secondary" onClick={() => addTag()}>Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.tags?.map((tag) => (
                                        <div key={tag} className="flex items-center gap-1 px-2 py-1 rounded-md text-sm" style={{ backgroundColor: theme.colors.primary + '20', color: theme.colors.primary }}>
                                            <span>{tag}</span>
                                            <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {(!formData.tags || formData.tags.length === 0) && (
                                        <span className="text-sm italic" style={{ color: theme.colors.textSecondary }}>No tags added</span>
                                    )}
                                </div>
                            </div>

                            {/* Custom Fields Input */}
                            <div>
                                <Label>Custom Fields</Label>
                                <div className="flex gap-2 mb-2">
                                    <Input
                                        value={customFieldKey}
                                        onChange={(e) => setCustomFieldKey(e.target.value)}
                                        placeholder="Field Name (e.g. Industry)"
                                    />
                                    <Input
                                        value={customFieldValue}
                                        onChange={(e) => setCustomFieldValue(e.target.value)}
                                        placeholder="Value (e.g. Tech)"
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomField())}
                                    />
                                    <Button type="button" variant="secondary" onClick={addCustomField}>Add</Button>
                                </div>
                                <div className="space-y-2 mt-3">
                                    {Object.entries(formData.customFields || {}).map(([key, value]) => (
                                        <div key={key} className="flex items-center justify-between p-2 rounded border text-sm" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background }}>
                                            <div>
                                                <span className="font-medium" style={{ color: theme.colors.text }}>{key}: </span>
                                                <span style={{ color: theme.colors.textSecondary }}>{value as React.ReactNode}</span>
                                            </div>
                                            <button type="button" onClick={() => removeCustomField(key)} className="text-red-500 hover:text-red-600 transition-colors">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Persons */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold" style={{ color: theme.colors.text }}>
                                Contact Persons
                            </h2>
                            <Button type="button" variant="secondary" size="sm" onClick={addContact}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Contact
                            </Button>
                        </div>

                        {formData.contacts?.length === 0 ? (
                            <div className="p-4 rounded border text-center text-sm" style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}>
                                No contact persons added. Click "Add Contact" to add multiple contacts.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {formData.contacts?.map((contact, index) => (
                                    <div key={index} className="p-4 rounded border relative" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background }}>
                                        <button
                                            type="button"
                                            onClick={() => removeContact(index)}
                                            className="absolute top-2 right-2 text-red-500 hover:bg-red-500/10 p-1 rounded transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mr-8">
                                            <div>
                                                <Label>First Name <span className="text-red-500">*</span></Label>
                                                <Input
                                                    value={contact.first_name}
                                                    onChange={(e) => updateContact(index, 'first_name', e.target.value)}
                                                    required
                                                    placeholder="Jane"
                                                />
                                            </div>
                                            <div>
                                                <Label>Last Name</Label>
                                                <Input
                                                    value={contact.last_name || ''}
                                                    onChange={(e) => updateContact(index, 'last_name', e.target.value)}
                                                    placeholder="Smith"
                                                />
                                            </div>
                                            <div>
                                                <Label>Job Title</Label>
                                                <Input
                                                    value={contact.job_title || ''}
                                                    onChange={(e) => updateContact(index, 'job_title', e.target.value)}
                                                    placeholder="CTO"
                                                />
                                            </div>
                                            <div>
                                                <Label>Email</Label>
                                                <Input
                                                    type="email"
                                                    value={contact.email || ''}
                                                    onChange={(e) => updateContact(index, 'email', e.target.value)}
                                                    placeholder="jane@example.com"
                                                />
                                            </div>
                                            <div>
                                                <Label>Phone</Label>
                                                <Input
                                                    type="tel"
                                                    value={contact.phone || ''}
                                                    onChange={(e) => updateContact(index, 'phone', e.target.value)}
                                                    placeholder="+123456789"
                                                />
                                            </div>
                                            <div className="flex items-center pt-6">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="primary_contact"
                                                        checked={contact.is_primary}
                                                        onChange={(e) => updateContact(index, 'is_primary', e.target.checked)}
                                                        className="w-4 h-4 cursor-pointer"
                                                        style={{ accentColor: theme.colors.primary }}
                                                    />
                                                    <span style={{ color: theme.colors.text }}>Primary Contact</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Additional Information */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>
                            Additional Information
                        </h2>
                        <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                placeholder="Add any additional notes about this client..."
                                rows={4}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-4 pt-4" style={{ borderTop: `1px solid ${theme.colors.border}` }}>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => navigate(buildHref('/clients'))}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    {isEdit ? 'Updating...' : 'Creating...'}
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    {isEdit ? 'Update Client' : 'Create Client'}
                                </>
                            )}
                        </Button>
                    </div>
                </Card>
            </form>
        </div>
    );
}
