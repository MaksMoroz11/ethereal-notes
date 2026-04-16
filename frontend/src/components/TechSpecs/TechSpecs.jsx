import React from 'react'
import styles from './TechSpecs.module.css'

const specs = [
    { title: 'Версионирование', desc: 'Каждое изменение сохраняется автоматически. Сравнивайте версии и возвращайтесь к предыдущим состояниям без потери данных.' },
    { title: 'Ролевая модель', desc: 'Точный контроль доступа. Назначайте права на уровне проекта, доски или отдельного документа.' },
    { title: 'Журнал действий', desc: 'Прозрачная история: кто, когда и что изменил. Аудит активности встроен в систему по умолчанию.' },
    { title: 'Локальное развёртывание', desc: 'Архитектура готова к деплою внутри корпоративной сети. Данные остаются под полным контролем команды.' }
]

export default function TechSpecs() {
    return (
        <section className={styles.specs}>
            <div className={styles.container}>
                <h2 className={styles.sectionTitle}>Технические возможности</h2>
                <div className={styles.grid}>
                    {specs.map((spec, i) => (
                        <div key={i} className={styles.card}>
                        <h3 className={styles.cardTitle}>{spec.title}</h3>
                        <p className={styles.cardDesc}>{spec.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}