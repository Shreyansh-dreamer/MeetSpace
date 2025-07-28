import { motion } from "framer-motion";

function Features({ imge, title, description }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      drag
      dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
      dragElastic={0.2}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-white rounded-2xl shadow-lg w-[280px] px-6 py-8 flex flex-col items-center text-center cursor-grab active:cursor-grabbing"
    >
      {/* Image */}
      <img src={imge} alt="Feature" className="w-60 h-60 mb-6" />

      {/* Title */}
      <h3 className="font-bold text-gray-900 text-lg mb-4 leading-snug">
        {Array.isArray(title) ? (
          <>
            {title[0]} <br /> {title[1]}
          </>
        ) : (
          title
        )}
      </h3>

      {/* Description */}
      <p className="text-[13px] text-gray-600 leading-snug font-semibold">
        {description}
      </p>
    </motion.div>
  );
}

export default Features;
