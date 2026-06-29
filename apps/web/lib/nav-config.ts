export const NAV_CONFIG = {
  primary: [
    { label: "Shop", href: "/shop" },
    { label: "Stories", href: "/stories" },
  ],
  groups: [
    {
      label: "Customer",
      items: [{ label: "Orders", href: "/orders" }],
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
