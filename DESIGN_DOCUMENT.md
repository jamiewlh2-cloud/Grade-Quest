# Grade Quest Adaptive Learning Design

**Document type:** Research and product-design specification  
**Scope:** Adaptive learning after study materials have been converted into questions  
**Learning model:** Deterministic retrieval practice, confidence calibration, and spaced review

## 1. Learning Objectives

### 1.1 Purpose

The learning engine should help a student move from recognition of course material to reliable, independent recall. It should spend study time where it produces the greatest learning benefit, make uncertainty visible, correct misconceptions quickly, and bring knowledge back for review before it is forgotten.

The system is not intended to maximize the number of questions answered or to reward short-term guessing. Its primary outcome is durable, accurately calibrated knowledge that can be recalled without prompts.

### 1.2 Learning outcomes

For each question and concept, the system should determine whether the student can:

- Retrieve the answer without relying on recognition alone.
- Distinguish the correct answer from plausible distractors.
- Apply the concept in a new or differently worded situation.
- Explain why an answer is correct and why alternatives are incorrect.
- Recall the concept after increasing periods without review.
- Judge confidence accurately rather than treating confidence as a substitute for correctness.

### 1.3 Mastery measurement

Mastery is a property of a question-concept pair, not a permanent label attached to a student. It is measured from repeated retrieval events across time, question variations, and confidence levels.

Mastery should require all of the following evidence:

- Recent correct retrievals.
- Correct retrieval after a delay.
- At least one successful retrieval with high confidence.
- No unresolved pattern of repeated errors.
- Confidence that is reasonably aligned with actual correctness.

One correct answer is evidence of performance on one occasion. It is not sufficient evidence of mastery.

### 1.4 Learning unit

Each question belongs to one or more learning objectives. A learning objective represents the knowledge or skill being tested, such as defining a term, comparing theories, identifying a process, or applying a rule.

Question-level performance is the most immediate signal. Objective-level mastery is the more meaningful learning signal because it combines evidence from related questions and prevents a student from appearing mastered after memorizing one wording.

## 2. Confidence System

Confidence is recorded at the moment of answering, before feedback is shown. It represents the student's judgment about the answer, not how difficult the question felt after seeing the result.

### 2.1 Single-click answer behaviour

A single click on an answer records a normal-confidence response. The student is committing to the answer without making a strong certainty claim.

Single-click responses should receive the standard mastery effect:

- Correct: meaningful positive evidence.
- Incorrect: meaningful negative evidence.
- Correct but uncertain: evidence of knowledge, but not strong evidence of stable mastery.

The single-click state is the default and should not be treated as low confidence or failure to understand.

### 2.2 Double-click answer behaviour

A double click on the same answer records a high-confidence response. It means: "I am certain this is correct."

Double-click responses have greater diagnostic value than single-click responses:

- Correct high-confidence answers provide strong evidence of mastery and calibration.
- Incorrect high-confidence answers indicate overconfidence and produce a larger correction to mastery.
- A correct answer does not receive the high-confidence benefit if the student changes answers before committing.

The confidence claim must be captured before the answer is revealed. Students must not be allowed to upgrade confidence after seeing whether they were right.

### 2.3 Multiple-answer uncertainty behaviour

For questions with multiple correct answers, confidence applies to the complete response, not to each selected option independently.

- Selecting only part of the answer set is incorrect unless partial credit is explicitly defined for that question.
- Selecting extra options is incorrect unless the question explicitly permits extra selections.
- A single-click submission means the student is committing with ordinary confidence.
- A double-click submission means the student is claiming certainty that the entire set is correct.

When the student is unsure between alternatives, the response should be recorded as uncertain rather than forcing false precision. If the student submits an explicit uncertainty state, the result remains eligible for learning credit when correct but receives a reduced mastery increase. An uncertain correct answer is treated as successful retrieval with weak calibration evidence.

### 2.4 Confidence levels

The learning engine uses three behavioural confidence levels:

| Level | Meaning | Evidence value |
| --- | --- | --- |
| Uncertain | The student is unsure or explicitly marks uncertainty. | Correct answers show emerging knowledge; incorrect answers are expected and receive a normal correction. |
| Standard | The student answers normally with no strong certainty claim. | Provides ordinary evidence of retrieval. |
| Certain | The student double-clicks to claim the answer is definitely correct. | Correct answers strongly support mastery; incorrect answers identify overconfidence. |

Confidence is not a grade. A student should never be penalized merely for honestly reporting uncertainty. The purpose of the system is to reward accurate confidence, not confidence by itself.

### 2.5 Calibration principle

The system should compare confidence with correctness over time:

- Certain and correct is calibrated confidence.
- Certain and incorrect is overconfidence.
- Uncertain and correct is underconfidence or fragile knowledge.
- Uncertain and incorrect is appropriately cautious but still requires learning.

Calibration affects scheduling and mastery evidence, not the student's academic grade.

## 3. Mastery System

### 3.1 Mastery scale

Each question-concept pair has a mastery value from 0 to 100:

- 0-29: Unfamiliar or substantially unstable.
- 30-59: Developing; some evidence of learning but unreliable recall.
- 60-79: Functional; usually correct under ordinary conditions.
- 80-94: Strong; reliable across delays and confidence levels.
- 95-100: Maintained; currently strong but still eligible for spaced checks.

These bands describe the quality of evidence. They do not mean that forgetting is impossible.

### 3.2 Initial mastery

New questions begin at 10 mastery. This represents exposure to the material without assuming that reading or import equals learning.

### 3.3 Mastery increases

After a response, the mastery change is determined by correctness, confidence, prior mastery, and time since the last successful retrieval.

Recommended deterministic changes for a normal question are:

| Response | Mastery change |
| --- | ---: |
| Correct, uncertain | +4 |
| Correct, standard confidence | +8 |
| Correct, certain | +12 |
| Incorrect, uncertain | -8 |
| Incorrect, standard confidence | -10 |
| Incorrect, certain | -18 |
| No response or timeout | -12 |

The value is bounded between 0 and 100. At high mastery, positive changes become smaller so that a short streak cannot create artificial certainty. At low mastery, negative changes are softened to avoid making a student feel permanently stuck.

### 3.4 Delayed retrieval bonus

A correct answer after the scheduled review date is stronger evidence than a correct answer immediately after the previous attempt. A delayed correct response may receive a bonus of up to 4 points, based on the length of the delay.

The bonus must be capped. Long absence should not turn a lucky answer into proof of mastery, and a student should not be encouraged to miss scheduled reviews to earn points.

### 3.5 Mastery decreases

Mastery decreases when the student answers incorrectly, fails to answer, or repeatedly demonstrates that prior knowledge is not available after a delay.

A single lapse should lower the next interval without erasing all previous learning. Repeated lapses should lower mastery more substantially and return the question to an earlier review cycle.

Mastery should also decay gradually when a question is not reviewed. This decay is slow for strong, recently demonstrated knowledge and faster for developing knowledge. The decay is a scheduling signal rather than a daily punishment.

### 3.6 Confidence effect on mastery

Confidence changes the strength and interpretation of evidence:

- High-confidence correct responses accelerate progression toward stable mastery.
- High-confidence incorrect responses lower mastery more than ordinary errors because they reveal a misconception or calibration problem.
- Low-confidence correct responses increase mastery but keep the question in active rotation until confidence improves.
- Low-confidence incorrect responses lower mastery without adding an overconfidence flag.

Mastery cannot reach the maintained band through uncertain correct answers alone. The student must eventually demonstrate confident, delayed retrieval.

### 3.7 Objective mastery

Objective mastery is calculated from the strongest available evidence across its questions, with greater weight given to:

- Questions reviewed after a delay.
- Questions requiring application rather than simple recognition.
- Recent independent retrieval.
- High-confidence answers that are correct.

One question should not dominate an objective when other related questions remain weak. An objective is considered mastered only when its minimum evidence threshold is met and no high-priority weak question remains unresolved.

## 4. Question Scheduling

### 4.1 Selection priorities

At the start of a session, eligible questions are ranked deterministically using:

1. Whether the question is due or overdue.
2. Low mastery.
3. Recent incorrect responses.
4. Repeated errors or overconfidence flags.
5. The importance of the linked learning objective.
6. The time since the question was last seen.
7. The need for balanced coverage across objectives.

Due questions should normally outrank new questions. New questions should still appear when no urgent reviews are available or when a session needs broader coverage.

### 4.2 Weak-question prioritization

Weak questions should be prioritized when they are:

- Below 60 mastery.
- Incorrect in the most recent attempt.
- Incorrect more than once in the last three attempts.
- Correct only with uncertainty.
- Correct recently but overdue for delayed confirmation.
- Marked by a mismatch between high confidence and low accuracy.

Repeatedly failed questions should not appear in an uninterrupted sequence. After one or two corrective attempts, the system should insert a related question, explanation review, or short retrieval break before returning to the original question.

### 4.3 Balance and interleaving

Sessions should mix nearby concepts with questions from different objectives. This prevents the student from relying on the previous question as a clue and encourages discrimination between similar ideas.

The selection order should avoid showing the same question wording repeatedly. When equivalent questions exist, the system should prefer a different wording or application context.

### 4.4 Mastered-question reappearance

Mastered questions should continue to reappear at increasing intervals:

1. Same session or next day after initial success.
2. Three days later.
3. Seven days later.
4. Fourteen days later.
5. Thirty days later.
6. Every 45 to 60 days for maintenance.

A mastered question returns earlier after an incorrect answer, an uncertain answer, or a confidence-calibration failure. Mastered questions should also appear as a small proportion of mixed sessions so that the student does not lose retrieval fluency between scheduled reviews.

### 4.5 Deterministic scheduling score

For each eligible question, the scheduling priority should combine four signals:

- **Need:** inverse mastery.
- **Urgency:** overdue time and missed reviews.
- **Risk:** recent errors and overconfidence.
- **Coverage:** whether the linked objective has been represented in the current session.

The same inputs must produce the same ordering. Ties should be resolved by oldest due date, then weakest mastery, then stable question order. Randomness must not be required for adaptation.

## 5. Review Cycles

### 5.1 Feedback timing

Correctness feedback should appear immediately after every committed answer. Immediate feedback prevents a misconception from being rehearsed and gives the student a clear relationship between the response and the result.

The feedback should identify:

- Whether the answer was correct.
- The correct answer when the response was wrong.
- Whether the confidence judgment was calibrated.
- The next action, such as continuing, reviewing, or retrying later.

### 5.2 Explanation timing

An explanation should be shown immediately when:

- The answer is incorrect.
- A certain answer is incorrect.
- A multiple-answer response is incomplete or includes an invalid option.
- The student is correct but uncertain on a question with a high error history.

For a correct standard-confidence answer, the explanation may be shown after the answer when it reinforces a distinction or prevents a common misconception. For a correct certain answer, a concise rationale should be available, but the system should avoid forcing unnecessary reading when the evidence is already strong.

An explanation is part of recovery, not a replacement for retrieval. After reading an explanation, the student should later answer a related question without seeing the explanation.

### 5.3 Session review cycles

A review session should contain three phases of question exposure:

- **Learning pass:** new and developing questions receive feedback and explanations.
- **Retrieval pass:** questions missed during the learning pass return after intervening questions, without immediately repeating the answer.
- **Retention pass:** selected previously mastered questions are mixed in to test delayed and independent recall.

The session should not end with a long uninterrupted block of new material. A closing retrieval pass should confirm what was retained from the session.

### 5.4 Review outcomes

Each question review should end in one of four outcomes:

- Mastered for now.
- Developing and scheduled soon.
- Needs explanation and later retry.
- Misconception or overconfidence risk requiring targeted review.

The outcome controls the next interval and the session summary. It must not be based only on whether the final answer was correct.

## 6. Error Recovery

### 6.1 Repeated mistakes

After two errors on the same question in one session:

- Stop immediate repetition.
- Show the explanation and the relevant distinction.
- Present a simpler or more direct related question.
- Return to the original question later in the session.

After three errors across recent sessions, the question should be associated with a recovery sequence: prerequisite recall, explanation, related example, then delayed retry. The question remains available but should not dominate the entire session.

### 6.2 Overconfidence

Overconfidence is identified when a student gives a certain response and is incorrect, especially when this happens repeatedly for the same objective.

The response should:

- Apply the largest normal mastery correction.
- Mark the question for earlier review.
- Show the explanation and the misleading distinction.
- Require a later correct response at standard confidence before accepting another certain response as evidence of stable mastery.

The system should communicate the calibration issue neutrally. It should describe the evidence as a confidence mismatch rather than labeling the student.

### 6.3 Guessing

Guessing is inferred from patterns, not from a single answer. Relevant patterns include correct answers marked uncertain, alternating answers, repeated misses after confident claims, and success that does not persist on delayed review.

When guessing is suspected:

- Correct answers receive limited mastery credit.
- The question returns sooner in a different form.
- The student receives a rationale or discrimination prompt.
- A later answer must remain correct after a delay before mastery can advance normally.

The system should not assume that a fast response is a guess unless response time is deliberately included as a learning signal. Confidence and delayed retention are more reliable than speed alone.

### 6.4 Underconfidence

Repeated uncertain-but-correct responses indicate possible underconfidence or fragile retrieval. The student should receive positive feedback that distinguishes correctness from certainty, while the question remains in rotation until the student can answer accurately with standard or high confidence.

## 7. Study Session Flow

### 7.1 Beginning

At the beginning of a session, the system should:

- Identify due, overdue, weak, and new questions.
- Select a bounded set appropriate for a single session.
- Include coverage across relevant learning objectives.
- Explain the session emphasis in learning terms, such as review, recovery, or new learning.
- Avoid presenting a mastery claim before the student has answered questions.

The session should begin with a small number of due or recently weak questions to establish retrieval context before introducing new questions.

### 7.2 Active session

During the active session:

1. Present one question for independent retrieval.
2. Record the answer and confidence before revealing correctness.
3. Give immediate correctness feedback.
4. Show an explanation when the response or question history requires it.
5. Update mastery, confidence calibration, and the next review interval.
6. Continue with a balanced selection of new, weak, due, and mastered questions.

The active session should alternate difficulty and objective so that students practice discrimination rather than memorizing a local pattern.

### 7.3 Review stage

The review stage revisits the session's errors and uncertain successes after an interval of intervening questions. It should test recall without displaying the previous answer or explanation first.

The review stage should prioritize:

- Incorrect questions.
- Certain-but-incorrect questions.
- Correct-but-uncertain questions.
- Questions that were answered correctly but have not yet survived delayed retrieval.

Review feedback should emphasize the reason for the error and the distinction the student needs to make next time.

### 7.4 Completion stage

At completion, the system should summarize learning evidence rather than merely count questions. The summary should state:

- Questions answered and objectives covered.
- Correctness and confidence calibration.
- Questions that improved.
- Questions still due or unstable.
- The next scheduled review window.

Completion should not imply that all material is mastered. A session is complete when its planned retrieval and review work is finished, including when the correct outcome is to schedule recovery for later.

## 8. Long-Term Retention Strategy

### 8.1 Spaced repetition

Spacing should increase only when retrieval remains successful. A recommended interval sequence is 1 day, 3 days, 7 days, 14 days, 30 days, and 45-60 days, with earlier review after errors or uncertainty.

The schedule should be based on demonstrated retention, not calendar time alone. A question that was answered correctly immediately after learning is less stable than one answered correctly after a week.

### 8.2 Retrieval practice

The system should prefer asking the student to produce or select an answer before showing an explanation. Re-reading, recognition, and explanation exposure are supporting activities; they do not independently establish mastery.

Retrieval should include both direct questions and application questions when both exist. The student must demonstrate that the concept transfers beyond a memorized phrase.

### 8.3 Reinforcement

Reinforcement should occur through:

- Immediate corrective feedback.
- Repeated retrieval after an interval.
- Interleaving related concepts.
- Recalling the reason an answer is correct.
- Revisiting a concept after a prior error has been corrected.

Correct answers should not end exposure permanently. They should move the question from acquisition to maintenance.

### 8.4 Memory retention

Retention should be estimated from delayed performance, not from session accuracy alone. The strongest evidence is a correct, confident answer after the question has been absent long enough that the previous answer is no longer active in working memory.

When retention weakens, the system should shorten the interval and provide a targeted review. It should preserve earlier evidence rather than resetting the learner to zero after one lapse.

### 8.5 Interleaving and desirable difficulty

Mixed practice should be used after a concept has received initial explanation. Interleaving makes questions harder in the moment but improves later discrimination and transfer. The system should avoid making every session maximally difficult; new or repeatedly failed material needs a clear recovery path before mixed practice resumes.

## 9. Student Analytics

Analytics should describe learning behaviour and support useful reflection. They should not be presented as a definitive measure of intelligence, effort, or academic worth.

### 9.1 Useful metrics

- First-attempt accuracy.
- Delayed-review accuracy.
- Accuracy by learning objective.
- Current mastery by question and objective.
- Number of questions due, overdue, and maintained.
- Error recurrence rate.
- Average reviews required before stable mastery.
- Retention after one day, one week, and one month.
- Session coverage across objectives.
- Explanation-to-retrieval ratio.
- Review adherence and missed review count.
- Number of mastered questions that later lapsed.

### 9.2 Confidence trends

Confidence analytics should include:

- Certain-correct rate.
- Certain-incorrect rate.
- Uncertain-correct rate.
- Uncertain-incorrect rate.
- Confidence accuracy gap.
- Calibration trend over time.
- Objectives with persistent overconfidence.
- Objectives with persistent underconfidence.

The confidence accuracy gap should compare the student's confidence category with actual correctness over a meaningful sample. A small gap indicates better calibration; it does not necessarily indicate higher knowledge.

### 9.3 Mastery trends

Mastery analytics should show:

- Growth in objective mastery over time.
- Questions moving from developing to functional or strong mastery.
- Questions falling back from maintained to developing.
- Mastery supported by delayed retrieval versus immediate practice.
- Recent weak concepts and their recovery status.
- Stability of mastery after errors.

Trends should use enough observations to avoid overreacting to one unusual session. A short-term dip can indicate healthy exposure to harder material rather than learning failure.

### 9.4 Interpretation rules

Analytics should distinguish activity from learning. Time spent, number of questions, and completed sessions are process measures. Delayed accuracy, stable mastery, and calibrated confidence are learning measures.

The system should avoid ranking students, comparing students, or presenting a single composite score as the complete state of learning. The most useful conclusion is which objectives are stable, which are fragile, and what type of review is due next.