export type NavLink = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

export type NavGroup = {
  label: string;
  links: NavLink[];
};

export type NavConfig = {
  primary: NavLink[];
  groups: NavGroup[];
};

export const NAV_CONFIG: NavConfig = {
  primary: [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    { href: "/stories", label: "Stories" },
  ],
  groups: [
    {
      label: "Customer",
      links: [{ href: "/orders", label: "Orders" }],
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
