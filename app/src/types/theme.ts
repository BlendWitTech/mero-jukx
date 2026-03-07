export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    accent: string;
    danger: string;
    error: string;
    warning: string;
    info: string;
    success: string;
}

export interface OrganizationTheme {
    mode: ThemeMode;
    colors: ThemeColors;
    fontFamily?: string;
    borderRadius?: string;
    customCSS?: string;
}
