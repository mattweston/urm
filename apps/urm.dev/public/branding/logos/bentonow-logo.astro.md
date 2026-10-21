---
import bentoLogo from "./bento-logo.png";
const { class: className, ...rest } = Astro.props;
---

<img src={bentoLogo.src} alt="Bentonow" class={className} width={bentoLogo.width} height={bentoLogo.height} {...rest} />
