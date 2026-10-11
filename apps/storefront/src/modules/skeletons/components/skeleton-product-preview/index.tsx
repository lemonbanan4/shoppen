const SkeletonProductPreview = () => {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/5] w-full bg-neutral-900 border border-gray-800" />
      <div className="flex justify-between mt-2.5">
        <div className="w-2/5 h-3.5 bg-neutral-900" />
        <div className="w-1/5 h-3.5 bg-neutral-900" />
      </div>
    </div>
  )
}

export default SkeletonProductPreview
