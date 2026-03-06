import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Hero } from '@/components/landing/hero'
import { Features } from '@/components/landing/features'
import { Stats } from '@/components/landing/stats'

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background">
        <Hero />
        <Features />
        <Stats />
      </main>
      <Footer />
    </>
  )
}
