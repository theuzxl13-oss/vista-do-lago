import { Hero } from '@/components/site/Hero'
import { About } from '@/components/site/About'
import { Gallery } from '@/components/site/Gallery'
import { LotsSection } from '@/components/site/LotsSection'
import { Location } from '@/components/site/Location'
import { Differentials } from '@/components/site/Differentials'
import { ContactSection } from '@/components/site/ContactSection'
import { useLots } from '@/hooks/useLots'
import { useSettings } from '@/context/SettingsContext'

export default function HomePage() {
  const { lots, blocks, loading, error } = useLots()
  const { settings } = useSettings()
  return (
    <>
      <Hero />
      <About lotsCount={lots.length} planIsDemo={settings.plan.is_demo} />
      <Gallery />
      <LotsSection lots={lots} blocks={blocks} loading={loading} error={error} />
      <Location />
      <Differentials />
      <ContactSection lots={lots} />
    </>
  )
}
