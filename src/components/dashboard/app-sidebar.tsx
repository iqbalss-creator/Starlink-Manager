"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Satellite, LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { sidebarNavigation, type NavItem } from "@/config/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

function NavGroup({ item, userRole }: { item: NavItem; userRole?: string }) {
  if (item.adminOnly && userRole === "reviewer") return null;

  const pathname = usePathname();

  // Determine if this group or any child is active
  const isGroupActive = item.children
    ? item.children.some(
        (child) =>
          pathname === child.href ||
          (child.href !== "/dashboard" && pathname.startsWith(child.href)),
      )
    : pathname === item.href;

  const [isOpen, setIsOpen] = React.useState(isGroupActive);

  // If no children, render a simple link
  if (!item.children || item.children.length === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={pathname === item.href}
          tooltip={item.title}
          render={<Link href={item.href} />}
          className="data-active:bg-[#C8FAD6] data-active:text-[#007867] dark:data-active:bg-[rgba(0,167,111,0.16)] dark:data-active:text-[#5BE584] data-active:font-semibold hover:bg-muted"
        >
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      {/* Group header button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-muted ${
          isGroupActive
            ? "text-[#007867] dark:text-[#5BE584]"
            : "text-foreground/80"
        }`}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{item.title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Submenu */}
      {isOpen && (
        <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-border pl-2">
          {item.children
            .filter((child) => !(child.adminOnly && userRole === "reviewer"))
            .map((child) => {
              const isChildActive =
                pathname === child.href ||
                (child.href !== "/dashboard" &&
                  pathname.startsWith(child.href));
              return (
                <Link
                  key={child.href}
                  href={child.comingSoon ? "#" : child.href}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                    isChildActive
                      ? "bg-[#C8FAD6] text-[#007867] font-semibold dark:bg-[rgba(0,167,111,0.16)] dark:text-[#5BE584]"
                      : child.comingSoon
                        ? "text-muted-foreground/50 cursor-not-allowed"
                        : "text-foreground/70 hover:bg-muted hover:text-foreground"
                  }`}
                  onClick={
                    child.comingSoon ? (e) => e.preventDefault() : undefined
                  }
                >
                  <child.icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{child.title}</span>
                  {child.comingSoon && (
                    <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                      Soon
                    </span>
                  )}
                </Link>
              );
            })}
        </div>
      )}
    </SidebarMenuItem>
  );
}

export function AppSidebar({
  userRole,
  ...props
}: React.ComponentProps<typeof Sidebar> & { userRole?: string }) {
  const [appName, setAppName] = React.useState("Starlink Manager");
  const [appLogo, setAppLogo] = React.useState("");

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("starlink_app_settings");
      if (stored) {
        const settings = JSON.parse(stored);
        if (settings.appName) setAppName(settings.appName);
        if (settings.appLogo) setAppLogo(settings.appLogo);
      }
    } catch {}

    // Listen for storage changes from other tabs or settings page
    const handleStorage = () => {
      try {
        const stored = localStorage.getItem("starlink_app_settings");
        if (stored) {
          const settings = JSON.parse(stored);
          if (settings.appName) setAppName(settings.appName);
          setAppLogo(settings.appLogo || "");
        }
      } catch {}
    };
    window.addEventListener("storage", handleStorage);

    // Custom event to detect changes from the same window
    window.addEventListener("appSettingsChanged", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("appSettingsChanged", handleStorage);
    };
  }, []);

  const words = appName.split(" ");
  const firstWord = words[0] || "Starlink";
  const restWords = words.length > 1 ? words.slice(1).join(" ") : "";

  return (
    <Sidebar {...props}>
      <SidebarHeader className="h-16 flex items-center justify-center border-b px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-xl tracking-tight"
        >
          {appLogo ? (
            <img src={appLogo} alt="Logo" className="w-8 h-8 object-contain" />
          ) : (
            <Satellite className="h-6 w-6 text-[#00A76F]" />
          )}
          <span>
            {firstWord} <span className="text-[#00A76F]">{restWords}</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <SidebarMenu className="gap-1">
          {sidebarNavigation.map((item) => (
            <NavGroup key={item.title} item={item} userRole={userRole} />
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t p-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-2 p-2 hover:bg-muted rounded-md text-sm text-destructive hover:text-destructive transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
          <div
            className="text-sm font-semibold text-muted-foreground truncate max-w-[100px]"
            title={userRole}
          >
            {userRole === "admin" ? "Administrator" : "Reviewer"}
          </div>
        </div>
        <ThemeToggle />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
