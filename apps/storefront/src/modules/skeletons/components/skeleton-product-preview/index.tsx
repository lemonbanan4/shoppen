const SkeletonProductPreview = () => {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/5] w-full bg-neutral-100 rounded-xl" />
      <div className="flex justify-between mt-3">
        <div className="w-2/5 h-4 bg-neutral-100 rounded" />
        <div className="w-1/5 h-4 bg-neutral-100 rounded" />
      </div>
    </div>
  )
}

export default SkeletonProductPreview
