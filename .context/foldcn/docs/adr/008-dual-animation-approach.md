# ADR-008: Animations — dual approach

Base style includes `tw-animate-css` for Tailwind animation classes. Components that need enter/leave transitions use Foldkit's `Animation` submodel to trigger those CSS animations. CSS defines keyframes, Foldkit triggers them.
