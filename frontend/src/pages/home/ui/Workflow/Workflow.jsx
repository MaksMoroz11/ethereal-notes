import React from 'react'
import styles from './Workflow.module.css'

const steps = [
    { num: '01', title: 'Создайте пространство', desc: 'Зарегистрируйтесь, создайте проект и пригласите участников. Настройте роли за пару кликов.' },
    { num: '02', title: 'Организуйте работу', desc: 'Перетаскивайте задачи по канбан-доске, ведите документацию в едином интерфейсе без переключения вкладок.' },
    { num: '03', title: 'Контролируйте изменения', desc: 'Автоматическое сохранение версий, журнал действий и возможность отката к любому предыдущему состоянию.' }
]

export default function Workflow() {
    return (
            <section className={styles.workflow}>
            <div className={styles.container}>
                <h2 className={styles.sectionTitle}>Как это работает</h2>
                <div className={styles.steps}>
                    {steps.map((step) => (
                        <div key={step.num} className={styles.step}>
                        <span className={styles.stepNumber}>{step.num}</span>
                        <h3 className={styles.stepTitle}>{step.title}</h3>
                        <p className={styles.stepDesc}>{step.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
