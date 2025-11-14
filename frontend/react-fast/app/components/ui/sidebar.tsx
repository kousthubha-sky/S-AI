"use client";

import { cn } from "~/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
  onClick?: () => void;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
  desktopHovered?: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return {
    ...context,
    shouldShowText: context.open || context.desktopHovered,
  };
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);
  const [desktopHovered, setDesktopHovered] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate, desktopHovered }}>
      <div
        onMouseEnter={() => setDesktopHovered(true)}
        onMouseLeave={() => setDesktopHovered(false)}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, animate, desktopHovered } = useSidebar();
  const isExpanded = open || desktopHovered;

  return (
    <motion.div
      className={cn(
        "h-full px-4 py-4 hidden md:flex md:flex-col bg-neutral-100 dark:bg-neutral-800 w-[300px] flex-shrink-0",
        className
      )}
      animate={{
        width: animate ? (isExpanded ? "300px" : "60px") : "300px",
      }}
      transition={{
        duration: 0.3,
        ease: "easeInOut",
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "flex flex-row md:hidden items-center justify-between bg-neutral-100 dark:bg-neutral-800 w-full flex-shrink-0"
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <Menu
            className="text-neutral-800 dark:text-neutral-200 cursor-pointer h-6 w-6"
            onClick={() => setOpen(!open)}
          />
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: "easeInOut",
            }}
            className={cn(
              "fixed h-full w-full inset-0 bg-neutral-100 dark:bg-neutral-900 p-6 z-[100] flex flex-col justify-between",
              className
            )}
          >
            <div
              className="absolute right-6 top-6 z-50 text-neutral-800 dark:text-neutral-200 cursor-pointer"
              onClick={() => setOpen(!open)}
            >
              <X className="h-6 w-6" />
            </div>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
}) => {
  const { open, animate, desktopHovered } = useSidebar();
  const shouldShow = open || desktopHovered;
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (link.onClick) {
      e.preventDefault();
      link.onClick();
    }
  };
  
  return (
    <a
      href={link.href}
      onClick={handleClick}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2 cursor-pointer",
        className
      )}
      {...props}
    >
      {link.icon}
      <motion.span
        animate={{
          display: animate ? (shouldShow ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (shouldShow ? 1 : 0) : 1,
        }}
        className="text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {link.label}
      </motion.span>
    </a>
  );
};