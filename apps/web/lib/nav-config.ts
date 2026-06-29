export interface NavLink {
  readonly href: string;
  readonly label: string;
  readonly adminOnly?: boolean;
}

export interface NavGroup {
  readonly label: string;
  readonly links: readonly NavLink[];
}

export interface NavConfig {
  readonly primary: readonly NavLink[];
  readonly groups: readonly NavGroup[];
}

export const NAV_CONFIG: NavConfig = {
  primary: [
    { href: "/shop", label: "Shop" },
    { href: "/stories", label: "Stories" },
    { href: "/orders", label: "Orders" },
  ],
  groups: [
    {
      label: "Customer",
      links: [
        { href: "/shop", label: "Shop" },
        { href: "/stories", label: "Stories" },
        { href: "/orders", label: "Orders" },
      ],
    },
    {
      label: "Admin",
      links: [
        { href: "/admin/skus", label: "SKUs" },
        { href: "/admin/orders", label: "Orders" },
        { href: "/admin/subjects", label: "Subjects" },
      ],
    },
  ],
};
