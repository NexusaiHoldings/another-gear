export type NavLink = { label: string; href: string };
export type NavGroup = { label: string; items: NavLink[] };
export type NavConfig = { primary: NavLink[]; groups: NavGroup[] };

export const NAV_CONFIG: NavConfig = {
  primary: [
    { label: "Shop", href: "/shop" },
    { label: "Stories", href: "/stories" },
    { label: "Orders", href: "/orders" },
  ],
  groups: [
    {
      label: "Customer",
      items: [
        { label: "Shop", href: "/shop" },
        { label: "Stories", href: "/stories" },
        { label: "Orders", href: "/orders" },
      ],
    },
    {
      label: "Admin",
      items: [
        { label: "SKUs", href: "/admin/skus" },
        { label: "Orders", href: "/admin/orders" },
        { label: "Subjects", href: "/admin/subjects" },
      ],
    },
  ],
};
