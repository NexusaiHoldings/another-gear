export type NavLink = {
  title: string;
  href: string;
  external?: boolean;
};

export type NavGroup = {
  title: string;
  links: NavLink[];
};

export type NavConfig = {
  primary: NavLink[];
  groups: NavGroup[];
};

export const NAV_CONFIG: NavConfig = {
  primary: [
    { title: "Conversation", href: "/conversation" },
    { title: "Work", href: "/work" },
    { title: "Artifacts", href: "/artifact" },
    { title: "Approvals", href: "/approval" },
    { title: "Direct", href: "/direct" },
    { title: "Shop", href: "/shop" },
  ],
  groups: [
    {
      title: "Customer",
      links: [
        { title: "Shop", href: "/shop" },
        { title: "Stories", href: "/stories" },
        { title: "Orders", href: "/orders" },
      ],
    },
    {
      title: "Admin",
      links: [
        { title: "SKUs", href: "/admin/skus" },
        { title: "Orders", href: "/admin/orders" },
        { title: "Subjects", href: "/admin/subjects" },
      ],
    },
  ],
};

export default NAV_CONFIG;
