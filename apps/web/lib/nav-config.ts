export const NAV_CONFIG = {
  primary: [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    { href: "/stories", label: "Stories" },
  ],
  groups: [
    {
      title: "Customer",
      items: [
        { href: "/shop", label: "Shop" },
        { href: "/stories", label: "Stories" },
        { href: "/orders", label: "Orders" },
      ],
    },
    {
      title: "Admin",
      items: [
        { href: "/admin/skus", label: "SKUs" },
        { href: "/admin/orders", label: "Orders" },
        { href: "/admin/subjects", label: "Subjects" },
      ],
    },
  ],
} as const;
