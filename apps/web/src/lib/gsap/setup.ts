'use client';

/**
 * Central GSAP setup for Testimona. Registers the plugins we use once,
 * client-side only (GSAP must never run during SSR). Import { gsap,
 * ScrollTrigger, useGSAP } from here in client components.
 *
 * Presentation layer only — no app logic depends on this.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export { gsap, ScrollTrigger, useGSAP };
