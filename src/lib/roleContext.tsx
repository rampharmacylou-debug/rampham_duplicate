"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Role = "admin" | "staff";

type RoleContextType = {
  role: Role;
  setRole: (r: Role) => void;
  isAdmin: boolean;
};

const RoleContext = createContext<RoleContextType>({
  role: "admin",
  setRole: () => {},
  isAdmin: true,
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("admin");

  // Read from localStorage on first mount
  useEffect(() => {
    const saved = localStorage.getItem("manifest_role");
    if (saved === "staff" || saved === "admin") setRoleState(saved);
  }, []);

  function setRole(r: Role) {
    setRoleState(r);
    localStorage.setItem("manifest_role", r);
  }

  return (
    <RoleContext.Provider value={{ role, setRole, isAdmin: role === "admin" }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
