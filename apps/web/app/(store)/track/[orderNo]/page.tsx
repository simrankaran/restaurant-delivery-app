import { Placeholder } from '@/components/placeholder';

export const metadata = { title: 'Track order' };

export default async function TrackPage({ params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params;
  return <Placeholder title={`Order ${orderNo}`} session="Session 6 (live tracking)" />;
}
