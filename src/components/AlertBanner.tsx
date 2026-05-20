import type { AlertData } from '../types';

interface Props {
  alert: AlertData;
}

export function AlertBanner({ alert }: Props) {
  return <div className={`alert alert-${alert.type}`}>{alert.text}</div>;
}
