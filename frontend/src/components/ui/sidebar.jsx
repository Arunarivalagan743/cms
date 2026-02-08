import { createContext, useContext, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { FiMenu, FiX } from "react-icons/fi";

const SidebarContext = createContext(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  const value = useMemo(() => ({ open, setOpen, animate }), [open, setOpen, animate]);

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate = true,
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = ({ className, children, ...props }) => {
  return (
    <>
      <DesktopSidebar className={className} {...props}>
        {children}
      </DesktopSidebar>
      <MobileSidebar className={className} {...props}>
        {children}
      </MobileSidebar>
    </>
  );
};

export const DesktopSidebar = ({ className, children, ...props }) => {
  const { open, setOpen, animate } = useSidebar();

  return (
    <motion.div
      className={`h-full px-2 py-4 hidden md:flex md:flex-col bg-white border-r border-slate-200 shrink-0 ${className || ""}`}
      animate={{
        width: animate ? (open ? "240px" : "60px") : "240px",
      }}
      transition={{
        duration: 0.3,
        ease: "easeInOut",
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const MobileSidebar = ({ className, children, ...props }) => {
  const { open, setOpen } = useSidebar();

  return (
    <>
      {/* Mobile toggle */}
      <div className="flex md:hidden fixed top-0 left-0 right-0 z-50 bg-white px-4 py-3 items-center justify-between shadow-sm border-b border-slate-200">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 shrink-0 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="text-base font-semibold text-slate-800">Signora</span>
        </div>
        <button onClick={() => setOpen(!open)} className="text-slate-600 p-1">
          <FiMenu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile overlay + drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-[90] md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={`fixed inset-y-0 left-0 z-[100] w-[260px] bg-white px-4 py-4 flex flex-col md:hidden shadow-2xl border-r border-slate-200 ${className || ""}`}
              {...props}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-6 shrink-0 text-primary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  <span className="text-base font-semibold text-slate-800">Signora</span>
                </div>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <FiX className="h-5 w-5" />
                </button>
              </div>
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  active,
  onClick,
  ...props
}) => {
  const { open, animate, setOpen } = useSidebar();

  const handleClick = useCallback((e) => {
    // Close mobile sidebar on link click
    if (window.innerWidth < 768) {
      setOpen(false);
    }
    if (onClick) onClick(e);
  }, [onClick, setOpen]);

  // Use react-router Link for internal navigation, <button> for actions
  const isButton = !link.href || link.href === "#";

  const content = (
    <>
      <span className="w-[20px] flex items-center justify-center shrink-0">
        {link.icon}
      </span>
      <AnimatePresence>
        {(open || !animate) && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="text-sm whitespace-nowrap overflow-hidden"
          >
            {link.label}
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );

  const baseClasses = `flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium leading-5 transition-colors ${
    active
      ? "bg-primary-50 text-primary-700"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
  } ${className || ""}`;

  if (isButton) {
    return (
      <button
        className={`${baseClasses} w-full text-left`}
        onClick={handleClick}
        {...props}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={link.href}
      className={baseClasses}
      onClick={handleClick}
      {...props}
    >
      {content}
    </Link>
  );
};

export const SidebarLabel = ({ label, className }) => {
  const { open, animate } = useSidebar();

  return (
    <AnimatePresence>
      {(open || !animate) && (
        <motion.p
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          exit={{ opacity: 0, width: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className={`px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.08em] whitespace-nowrap overflow-hidden ${className || ""}`}
        >
          {label}
        </motion.p>
      )}
    </AnimatePresence>
  );
};
