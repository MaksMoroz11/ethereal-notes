import React from 'react'
import styles from './Features.module.css'

const features = [
	{ title: 'Канбан-доски', desc: 'Визуализируйте статусы задач. Перетаскивайте карточки, назначайте исполнителей и отслеживайте прогресс.' },
	{ title: 'Документация', desc: 'Создавайте структурированные страницы с вложенностью. Все изменения автоматически сохраняются.' },
	{ title: 'Версионирование', desc: 'История правок для каждой задачи и документа. Откатывайтесь к любой версии в один клик.' },
	{ title: 'Командный доступ', desc: 'Гибкая ролевая модель. Настраивайте права на чтение, редактирование и администрирование.' }
]

export default function Features() {
	return (
		<section className={styles.features}>
			<div className={styles.container}>
				<h2 className={styles.sectionTitle}>Возможности платформы</h2>
				<div className={styles.grid}>
					{features.map((feature, index) => (
						<div key={index} className={styles.card}>
							<h3 className={styles.cardTitle}>{feature.title}</h3>
							<p className={styles.cardDesc}>{feature.desc}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}