import { useOutletContext, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ContributionTracker from '../../components/ContributionTracker';

export default function Contributions() {
  const { project, isMember, isOwner } = useOutletContext();

  if (!isMember) {
    return <Navigate to={`/projects/${project.id}`} replace />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <ContributionTracker projectId={project.id} isOwner={isOwner} />
    </motion.div>
  );
}
