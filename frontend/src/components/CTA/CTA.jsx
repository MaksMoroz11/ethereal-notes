import React from 'react'
import styles from './CTA.module.css'

export default function CTA() {
    return (
        <section className={styles.cta}>
            <div className={styles.container}>
                <h2 className={styles.title}>Готовы навести порядок в проектах?</h2>
                <p className={styles.subtitle}>
                    Создайте рабочее пространство за 2 минуты. Бесплатно для команд до 5 человек.
                </p>
                <button className={styles.primaryButton}>
                    Создать аккаунт
                </button>
            </div>
        </section>
    )
}