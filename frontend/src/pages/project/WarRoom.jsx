import { useOutletContext, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import WarRoomChat from '../../components/WarRoomChat';
import { useAuth } from '../../context/AuthContext';

export default function WarRoom() {
  const { project, isMember } = useOutletContext();
  const { user } = useAuth();

  if (!isMember) {
    return <Navigate to={`/projects/${project.id}`} replace />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 w-full"
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-ink pb-2">
        <span className="fm-label !text-ink">Operations sheet — war room</span>
        <span className="fm-label !text-[10px] text-graphite">{project.title}</span>
      </div>
      <div className="mt-5">
        <WarRoomChat project={project} user={user} />
      </div>
    </motion.div>
  );
}
