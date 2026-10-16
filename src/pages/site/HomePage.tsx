import { Hero } from '@/components/site/Hero'
import { About } from '@/components/site/About'
import { Gallery } from '@/components/site/Gallery'
import { LotsSection } from '@/components/site/LotsSection'
import { Location } from '@/components/site/Location'
import { Differentials } from '@/components/site/Differentials'
import { ContactSection } from '@/components/site/ContactSection'
import { PanoramaBand } from '@/components/site/PanoramaBand'
import { useLots } from '@/hooks/useLots'
import { usePanoramas } from '@/hooks/usePanoramas'
import { useSettings } from '@/context/SettingsContext'

export default function HomePage() {
  const { lots, blocks, loading, error } = useLots()
  const { settings } = useSettings()
  const [pano1, pano2] = usePanoramas()
  return (
    <>
      <Hero />
      <About lotsCount={lots.length} planIsDemo={settings.plan.is_demo} />
      <PanoramaBand image={pano1.url} caption={pano1.caption} eyebrow="Natureza" quote="Acordar com a luz refletida no lago." />
      <Gallery />
      <LotsSection lots={lots} blocks={blocks} loading={loading} error={error} />
      <PanoramaBand image={pano2.url} caption={pano2.caption} eyebrow="Tranquilidade" quote="O silêncio também é um endereço." align="right" />
      <Location />
      <Differentials />
      <ContactSection lots={lots} />
    </>
  )
}
