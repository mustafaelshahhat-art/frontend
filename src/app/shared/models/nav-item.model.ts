export interface NavItem {
    label: string;
    icon: string;
    route: string;
    active?: boolean;
    exact?: boolean;
    badge?: string | number;
}
