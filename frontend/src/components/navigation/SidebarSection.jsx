import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import SidebarItem from "./SidebarItem";

export default function SidebarSection({
  title,
  icon: Icon,
  links,
  isOpen,
  onToggle,
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="mb-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-white"
      >
        <div className="flex items-center gap-2">
          <Icon size={17} />
          <span>{title}</span>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.18 }}
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0,
            }}
            transition={{
              duration: 0.18,
              ease: "easeOut",
            }}
            className="overflow-hidden"
          >
            <div className="space-y-1 pl-5">
              {links.map((link) => (
                <SidebarItem key={link.path} link={link} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
