import { Link } from 'react-router-dom'

interface BreadcrumbItem {
  label: string
  path?: string
}

interface Props {
  items: BreadcrumbItem[]
}

export default function Breadcrumb({ items }: Props) {
  return (
    <nav className="breadcrumb">
      {items.map((item, index) => (
        <span key={index}>
          {index > 0 && <span className="breadcrumb-separator">/</span>}
          {item.path ? (
            <Link to={item.path} className="breadcrumb-link">
              {item.label}
            </Link>
          ) : (
            <span className="breadcrumb-current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
