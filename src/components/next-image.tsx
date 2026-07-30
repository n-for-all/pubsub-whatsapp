// Shim for next/image to work in Vite
import React from 'react'

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  width?: number | string
  height?: number | string
  priority?: boolean
  fill?: boolean
}

export default function Image({ width, height, priority, fill, ...props }: ImageProps) {
  const style: React.CSSProperties = {}
  
  if (width && !fill) {
    style.width = typeof width === 'number' ? `${width}px` : width
  }
  if (height && !fill) {
    style.height = typeof height === 'number' ? `${height}px` : height
  }
  if (fill) {
    style.width = '100%'
    style.height = '100%'
    style.objectFit = 'cover'
  }
  
  return <img {...props} style={{ ...style, ...props.style }} />
}
