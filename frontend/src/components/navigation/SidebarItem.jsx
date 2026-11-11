import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

export default function SidebarItem({ link }) {
  const Icon = link.icon;

  return (
    <NavLink to={link.path}>
      {({ isActive }) => (
        <motion.div
          whileHover={{ x: 2 }}
          transition={{ duration: 0.15 }}
          className={
            `
            relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all
            ${
              isActive
                ? "bg-violet-500/10 text-white"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }
          `
          }
        >
          {isActive && (
            <span className="absolute left-1 top-1 bottom-1 w-1 rounded-full bg-violet-500" />
          )}

          <Icon size={18} />

          <span className="font-medium">{link.name}</span>

          {link.soon && (
            <span className="ml-auto rounded-md bg-white/5 px-1.5 py-0.5 text-xs text-zinc-400">
              Soon
            </span>
          )}
        </motion.div>
      )}
    </NavLink>
  );
}
