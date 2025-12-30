import { useEffect, useRef, useState, useCallback } from 'react';

interface ScrollRevealOptions {
    threshold?: number;
    rootMargin?: string;
    once?: boolean;
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
    options: ScrollRevealOptions = {}
): [React.RefObject<T>, boolean] {
    const { threshold = 0.1, rootMargin = '0px 0px -80px 0px', once = true } = options;
    const ref = useRef<T>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (once) {
                        observer.unobserve(element);
                    }
                } else if (!once) {
                    setIsVisible(false);
                }
            },
            { threshold, rootMargin }
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [threshold, rootMargin, once]);

    return [ref, isVisible];
}

export function useScrollRevealGroup(count: number, options: ScrollRevealOptions = {}) {
    const { threshold = 0.1, rootMargin = '0px 0px -50px 0px', once = true } = options;
    const containerRef = useRef<HTMLDivElement>(null);
    const [visibleItems, setVisibleItems] = useState<boolean[]>(new Array(count).fill(false));

    const setItemVisible = useCallback((index: number, visible: boolean) => {
        setVisibleItems(prev => {
            const next = [...prev];
            next[index] = visible;
            return next;
        });
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const children = container.children;
        const observers: IntersectionObserver[] = [];

        Array.from(children).forEach((child, index) => {
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setItemVisible(index, true);
                        if (once) {
                            observer.unobserve(child);
                        }
                    } else if (!once) {
                        setItemVisible(index, false);
                    }
                },
                { threshold, rootMargin }
            );

            observer.observe(child);
            observers.push(observer);
        });

        return () => observers.forEach(o => o.disconnect());
    }, [count, threshold, rootMargin, once, setItemVisible]);

    return { containerRef, visibleItems };
}
