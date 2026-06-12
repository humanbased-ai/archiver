
import { AnimatePresence, motion } from 'framer-motion'

const Component = (props:{className?: string, children: React.ReactNode, style?: React.CSSProperties}) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.98, top: 24, opacity: 0 }}
        animate={{ scale: 1, top: 0, opacity: 1 }}
        // exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={props.className}
        style={props.style}
      >
        {props.children}
      </motion.div>
    </AnimatePresence>
  )
}

export default Component
