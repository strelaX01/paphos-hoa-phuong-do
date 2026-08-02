/**
 * Driver layout — overrides root layout for mobile driver app experience
 */
export const metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

export default function DriverLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#F2EAD8]">
      {children}
    </div>
  )
}
