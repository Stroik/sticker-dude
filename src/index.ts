import Whatsapp from './lib/Whatsapp';

async function main() {
  const whatsapp = new Whatsapp('demo');
  whatsapp.init();
  whatsapp.qrCode();
}

main();
