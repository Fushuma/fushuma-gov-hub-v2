import { http, createConfig } from 'wagmi';
import { fushuma } from '@/config/chains/fushuma';
import { bttc } from '@/config/chains/btt';
import { callisto } from '@/config/chains/callisto';
import { etc } from '@/config/chains/etc';

export const config = createConfig({
  chains: [fushuma, bttc, callisto, etc],
  transports: {
    [fushuma.id]: http(),
    [bttc.id]: http(),
    [callisto.id]: http(),
    [etc.id]: http(),
  },
});

