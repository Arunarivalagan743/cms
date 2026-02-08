import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  FiHome,
  FiFileText,
  FiUsers,
  FiLogOut,
  FiActivity,
  FiSettings,
  FiShield,
  FiBookOpen,
  FiClock,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { logout } from "../services/authService";
import {
  Sidebar as SidebarWrapper,
  SidebarBody,
  SidebarLink,
  SidebarLabel,
  useSidebar,
} from "./ui/sidebar";

const SidebarContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logoutUser, hasPermission, hasAnyPermission } = useAuth();
  const { open, animate } = useSidebar();

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <FiHome className="h-[18px] w-[18px] shrink-0" />,
      show: hasPermission("canViewDashboard"),
    },
    {
      name: "Contracts",
      href: "/contracts",
      icon: <FiFileText className="h-[18px] w-[18px] shrink-0" />,
      show: hasAnyPermission("canViewAllContracts", "canViewOwnContracts"),
    },
    {
      name: "Users",
      href: "/users",
      icon: <FiUsers className="h-[18px] w-[18px] shrink-0" />,
      show: hasPermission("canManageUsers"),
    },
    {
      name: "My Activity",
      href: "/my-activity",
      icon: <FiClock className="h-[18px] w-[18px] shrink-0" />,
      show: true,
    },
  ];

  const adminNavigation = [
    {
      name: "Audit Trail",
      href: "/admin/audit-trail",
      icon: <FiBookOpen className="h-[18px] w-[18px] shrink-0" />,
      show: hasPermission("canViewAuditLogs"),
    },
    {
      name: "System Logs",
      href: "/admin/system-logs",
      icon: <FiActivity className="h-[18px] w-[18px] shrink-0" />,
      show: hasPermission("canViewSystemLogs"),
    },
    {
      name: "Workflows",
      href: "/admin/workflows",
      icon: <FiSettings className="h-[18px] w-[18px] shrink-0" />,
      show: hasPermission("canConfigureWorkflow"),
    },
    {
      name: "Permissions",
      href: "/admin/permissions",
      icon: <FiShield className="h-[18px] w-[18px] shrink-0" />,
      show: hasPermission("canConfigurePermissions"),
    },
  ];

  const showAdminSection = adminNavigation.some((item) => item.show);

  const isActiveRoute = (href) =>
    location.pathname === href ||
    (href !== "/dashboard" && location.pathname.startsWith(href));

  const handleLogout = async () => {
    try {
      await logout();
      logoutUser();
      navigate("/login");
    } catch {
      logoutUser();
      navigate("/login");
    }
  };

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-1 mb-6">
        <span className="w-[20px] flex items-center justify-center shrink-0">
          <svg className="w-[20px] h-[20px] text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </span>
        {(open || !animate) && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="text-lg font-semibold text-white whitespace-nowrap overflow-hidden tracking-tight"
          >
            Signora
          </motion.span>
        )}
      </div>

      {/* User Info */}
      <div className="flex items-center gap-3 px-3 py-2 mb-5">
        <span className="w-[20px] flex items-center justify-center shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
        </span>
        {(open || !animate) && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="min-w-0 overflow-hidden"
          >
            <p className="text-sm font-medium text-slate-200 truncate">
              {user?.name}
            </p>
            <p className="text-[11px] text-slate-500 capitalize truncate">
              {user?.role?.replace("_", " ")}
            </p>
          </motion.div>
        )}
      </div>

      {/* Main Navigation */}
      <div className="flex-1 flex flex-col overflow-x-hidden overflow-y-auto space-y-1">
        {navigation
          .filter((item) => item.show)
          .map((item) => (
            <SidebarLink
              key={item.name}
              link={{ label: item.name, href: item.href, icon: item.icon }}
              active={isActiveRoute(item.href)}
            />
          ))}

        {/* Admin Section */}
        {showAdminSection && (
          <>
            <div className="pt-5 pb-1">
              <SidebarLabel label="Administration" />
            </div>
            {adminNavigation
              .filter((item) => item.show)
              .map((item) => (
                <SidebarLink
                  key={item.name}
                  link={{ label: item.name, href: item.href, icon: item.icon }}
                  active={isActiveRoute(item.href)}
                />
              ))}
          </>
        )}
      </div>

      {/* Bottom: Logout */}
      <div className="pt-4 border-t border-slate-700">
        <SidebarLink
          link={{
            label: "Logout",
            href: "#",
            icon: <FiLogOut className="h-[18px] w-[18px] shrink-0" />,
          }}
          onClick={handleLogout}
          className="hover:!bg-red-600/20 hover:!text-red-400"
        />
      </div>
    </>
  );
};

const AppSidebar = () => {
  const [open, setOpen] = useState(false);

  return (
    <SidebarWrapper open={open} setOpen={setOpen} animate={true}>
      <SidebarBody className="justify-between gap-2 border-r border-slate-700">
        <SidebarContent />
      </SidebarBody>
    </SidebarWrapper>
  );
};

export default AppSidebar;
