import { SourceArticle } from '../types';

// Data is inlined here for simplicity, but in a larger app, this would be loaded from files.
const IEP_DATA = `
Título: A Priori and A Posteriori
Link: https://iep.utm.edu/apriori/

Título: Abelard, Peter
Link: https://iep.utm.edu/abelard/

Título: Logic
Link: https://iep.utm.edu/abelard-logic/

Título: Abortion
Link: https://iep.utm.edu/abortion/

Título: Abstractionism in Mathematics
Link: https://iep.utm.edu/abstractionism/

Título: Academy, Plato’s
Link: https://iep.utm.edu/plato-academy/

Título: Addams, Jane
Link: https://iep.utm.edu/addamsj/

Título: Adorno, Theodor
Link: https://iep.utm.edu/adorno/

Título: Advaita Vedānta
Link: https://iep.utm.edu/advaita-vedanta/

Título: Aesop’s Fables
Link: https://iep.utm.edu/aesop/

Título: Aesthetics
Link: https://iep.utm.edu/aesthetics/

Título: Ancient
Link: https://iep.utm.edu/ancient-aesthetics/

Título: Attitude
Link: https://iep.utm.edu/aesthetic-attitude/

Título: Continental Philosophy
Link: https://iep.utm.edu/aesthetics-in-continental-phil/

Título: Emotion
Link: https://iep.utm.edu/art-and-emotion/

Título: Empirical
Link: https://iep.utm.edu/empirical-aesthetics/

Título: Epistemology
Link: https://iep.utm.edu/art-and-epistemology/

Título: Ethical Criticism
Link: https://iep.utm.edu/ethical-criticism-of-art/

Título: Formalism
Link: https://iep.utm.edu/aesthetic-formalism/

Título: Medieval Theories
Link: https://iep.utm.edu/medieval-theories-of-aesthetics/

Título: Popular Music
Link: https://iep.utm.edu/aesthetics-of-popular-music/

Título: Taste
Link: https://iep.utm.edu/aesthetic-taste/

Título: Value of Art
Link: https://iep.utm.edu/value-of-art/

Título: African Diaspora Religions, Philosophy of
Link: https://iep.utm.edu/african-diaspora/

Título: African Philosophical Perspectives on the Meaning of LIfe
Link: https://iep.utm.edu/african-meaning-of-life/

Título: African Philosophy, History of
Link: https://iep.utm.edu/history-of-african-philosophy/

Título: African Predicament, The
Link: https://iep.utm.edu/african-predicament/

Título: African Sage Philosophy
Link: https://iep.utm.edu/african-sage/

Título: Agamben, Giorgio
Link: https://iep.utm.edu/agamben/

Título: Alexander Polyhistor
Link: https://iep.utm.edu/alexander-polyhistor/

Título: Alexander, Samuel
Link: https://iep.utm.edu/samuel-alexander/

Título: Altruism and Group Selection
Link: https://iep.utm.edu/altruism-and-group-selection/

Título: American Enlightenment Thought
Link: https://iep.utm.edu/american-enlightenment-thought/

Título: American Philosophy
Link: https://iep.utm.edu/american-philosophy/

Título: American Transcendentalism
Link: https://iep.utm.edu/am-trans/

Título: American Wilderness Philosophy
Link: https://iep.utm.edu/american-wilderness-philosophy/

Título: Analytic Philosophy
Link: https://iep.utm.edu/analytic-philosophy/

Título: Anaxagoras
Link: https://iep.utm.edu/anaxagoras/

Título: Anaxarchus
Link: https://iep.utm.edu/anaxarchus/

Título: Anaximander
Link: https://iep.utm.edu/anaximander/

Título: Anaximenes
Link: https://iep.utm.edu/anaximenes/

Título: Ancient Aesthetics
Link: https://iep.utm.edu/ancient-aesthetics/

Título: Ancient Ethics
Link: https://iep.utm.edu/modern-morality-ancient-ethics/

Título: Ancient Greek Philosophy
Link: https://iep.utm.edu/ancient-greek-philosophy/

Título: Ancient Greek Skepticism
Link: https://iep.utm.edu/ancient-greek-skepticism/

Título: Anderson, John
Link: https://iep.utm.edu/john-anderson/

Título: Animal Minds
Link: https://iep.utm.edu/animal-mind/

Título: Animals and Ethics
Link: https://iep.utm.edu/animals-and-ethics/

Título: Animism
Link: https://iep.utm.edu/animism/

Título: Anomalous Monism, Davidson and
Link: https://iep.utm.edu/donald-davidson-anomalous-monism/

Título: Anscombe, G.E.M.
Link: https://iep.utm.edu/anscombe/

Título: Anselm of Canterbury
Link: https://iep.utm.edu/anselm-of-centerbury/

Título: Anselm: Ontological Argument for God’s Existence
Link: https://iep.utm.edu/anselm-ontological-argument/

Título: Anthropology, The Philosophy of
Link: https://iep.utm.edu/philosophy-of-anthropology/

Título: Anti-Natalism
Link: https://iep.utm.edu/anti-natalism/

Título: Antirealism, Scientific Realism and
Link: https://iep.utm.edu/scientific-realism-antirealism/

Título: Antisthenes
Link: https://iep.utm.edu/antisthenes/

Título: Apology
Link: https://iep.utm.edu/apology/

Título: Applied Ethics
Link: https://iep.utm.edu/applied-ethics/

Título: Aquinas, Thomas
Link: https://iep.utm.edu/thomas-aquinas/

Título: Metaphysics
Link: https://iep.utm.edu/thomas-aquinas-metaphysics/

Título: Moral Philosophy
Link: https://iep.utm.edu/thomasaquinas-moral-philosophy/

Título: Political Philosophy
Link: https://iep.utm.edu/thomas-aquinas-political-philosophy/

Título: Theology
Link: https://iep.utm.edu/thomas-aquinas-political-theology/

Título: Architecture, Philosophy of
Link: https://iep.utm.edu/philosophy-of-architecture/

Título: Arendt, Hannah
Link: https://iep.utm.edu/hannah-arendt/

Título: Argument
Link: https://iep.utm.edu/argument/

Título: Aristippus
Link: https://iep.utm.edu/aristippus/

Título: Aristotle
Link: https://iep.utm.edu/aristotle/

Título: Biology
Link: https://iep.utm.edu/aristotle-biology/

Título: Epistemology
Link: https://iep.utm.edu/aristotle-epistemology/

Título: Ethics
Link: https://iep.utm.edu/aristotle-ethics/

Título: Logic
Link: https://iep.utm.edu/aristotle-logic/

Título: Metaphysics
Link: https://iep.utm.edu/aristotle-metaphysics/

Título: Motion
Link: https://iep.utm.edu/aristotle-motion/

Título: Poetics
Link: https://iep.utm.edu/aristotle-poetics/

Título: Politics
Link: https://iep.utm.edu/aristotle-politics/

Título: Arithmetic and Geometry, Cognitive Foundations and Epistemology of
Link: https://iep.utm.edu/arithmetic-and-geometry/

Título: Arnauld, Agnes
Link: https://iep.utm.edu/agnes-arnauld/

Título: Arnauld, Angélique
Link: https://iep.utm.edu/angelique-arnauld/

Título: Arnauld, Antoine
Link: https://iep.utm.edu/antoine-arnauld/

Título: Art and Emotion
Link: https://iep.utm.edu/art-and-emotion/

Título: Art and Epistemology
Link: https://iep.utm.edu/art-and-epistemology/

Título: Art and Interpretation
Link: https://iep.utm.edu/art-and-interpretation/

Título: Art, Definition of
Link: https://iep.utm.edu/definition-of-art/

Título: Art, Ethical Criticism of
Link: https://iep.utm.edu/ethical-criticism-of-art/

Título: Artificial Intelligence
Link: https://iep.utm.edu/artificial-intelligence/

Título: Ethics of
Link: https://iep.utm.edu/ethics-of-artificial-intelligence/

Título: Artistic Medium
Link: https://iep.utm.edu/artistic-medium/

Título: Associationism in the Philosophy of MInd
Link: https://iep.utm.edu/associationism-in-philosophy-of-mind/

Título: Astell, Mary
Link: https://iep.utm.edu/mary-astell/

Título: Astrology, Hellenistic
Link: https://iep.utm.edu/hellenistic-astrology/

Título: Atheism
Link: https://iep.utm.edu/atheism/

Título: Humean Arguments from Evil for
Link: https://iep.utm.edu/humeevil/

Título: The New Atheists
Link: https://iep.utm.edu/new-atheism/

Título: Augustine: Political and Social Philosophy
Link: https://iep.utm.edu/augustine-political-and-social-philosophy/

Título: Aurelius, Marcus
Link: https://iep.utm.edu/marcus-aurelius/

Título: Austin, John Langshaw
Link: https://iep.utm.edu/john-austin/

Título: Autism
Link: https://iep.utm.edu/autism/

Título: Autonomy
Link: https://iep.utm.edu/autonomy/

Título: Normative
Link: https://iep.utm.edu/normative-autonomy/

Título: Averroes (Ibn Rushd)
Link: https://iep.utm.edu/ibn-rushd-averroes/

Título: Avicenna (Ibn Sina)
Link: https://iep.utm.edu/avicenna-ibn-sina/

Título: Logic
Link: https://iep.utm.edu/ibn-sina-avicenna-logic/

Título: Axiology of Theism
Link: https://iep.utm.edu/axiology-of-theismi/

Título: Aztec Philosophy
Link: https://iep.utm.edu/aztec-philosophy/

Título: Bacon, Francis
Link: https://iep.utm.edu/francis-bacon/

Título: Bacon, Roger
Link: https://iep.utm.edu/roger-bacon/

Título: Bacon: Language
Link: https://iep.utm.edu/roger-bacon-language/

Título: Bakhtin Circle
Link: https://iep.utm.edu/bakhtin-circle/

Título: Bayle, Pierre
Link: https://iep.utm.edu/pierre-bayle/

Título: Beattie, James
Link: https://iep.utm.edu/james-beattie/

Título: Beauvoir, Simone de
Link: https://iep.utm.edu/simone-de-beauvoir/

Título: Behaviorism
Link: https://iep.utm.edu/behaviorism/

Título: Being
Link: https://iep.utm.edu/being/

Título: Belief, The Aim of
Link: https://iep.utm.edu/aim-of-belief/

Título: Bell Inequalities
Link: https://iep.utm.edu/einstein-podolsky-rosen-argument-bell-inequalities/

Título: Benacerraf Problem of Mathematical Truth and Knowledge
Link: https://iep.utm.edu/benacerraf-problem-of-mathematical-truth-and-knowledge/

Título: Bentham, Jeremy
Link: https://iep.utm.edu/jeremy-bentham/

Título: Berkeley, George
Link: https://iep.utm.edu/george-berkeley-british-empiricist/

Título: Philosophy of Science
Link: https://iep.utm.edu/george-berkeley-philosophy-of-science/

Título: Berlin Circle
Link: https://iep.utm.edu/berlin-circle/

Título: Bhagavad Gita
Link: https://iep.utm.edu/bhagavad-gita/

Título: Bhartrihari
Link: https://iep.utm.edu/bhartrihari/

Título: Bhedābheda Vedānta
Link: https://iep.utm.edu/bhedabheda-vedanta/

Título: Bioethics
Link: https://iep.utm.edu/bioethics/

Título: Biology, Philosophy of
Link: https://iep.utm.edu/philosophy-of-biology/

Título: Blaga, Lucian
Link: https://iep.utm.edu/lucian-blaga/

Título: Blanchot, Maurice
Link: https://iep.utm.edu/maurice-blanchot/

Título: Blame and Praise
Link: https://iep.utm.edu/blame-and-praise/

Título: Blondel, Maurice
Link: https://iep.utm.edu/maurice-blondel/

Título: Bodily Awareness
Link: https://iep.utm.edu/bodily-awareness/

Título: Bodin, Jean
Link: https://iep.utm.edu/jean-bodin/

Título: Boethius
Link: https://iep.utm.edu/boethius/

Título: Bolzano: Mathematical Knowledge
Link: https://iep.utm.edu/bernard-bolzano-mathematics/

Título: Bonaventure
Link: https://iep.utm.edu/bonaventure/

Título: Bonhoeffer, Dietrich
Link: https://iep.utm.edu/dietrich-bonhoeffer/

Título: Boredom
Link: https://iep.utm.edu/boredom/

Título: Boyle, Robert
Link: https://iep.utm.edu/robert-boyle/

Título: Logic
Link: https://iep.utm.edu/f-h-bradley-logic/

Título: Brain-in-a-Vat Argument
Link: https://iep.utm.edu/brain-in-a-vat-argument/

Título: Brentano, Franz
Link: https://iep.utm.edu/brentano/

Título: British Empiricism
Link: https://iep.utm.edu/british-empiricism/

Título: Bruno, Giordano
Link: https://iep.utm.edu/giordano-bruno/

Título: Buber, Martin
Link: https://iep.utm.edu/martin-buber/

Título: Buddha
Link: https://iep.utm.edu/buddha/

Título: Buddhism – Madhyamaka
Link: https://iep.utm.edu/madhyamaka-buddhist-philosophy/

Título: Buddhism – Pudgalavāda
Link: https://iep.utm.edu/pudgalavada-buddhist-philosophy/

Título: Buddhism – Sarvāstivāda
Link: https://iep.utm.edu/sarvastivada-buddhism/

Título: Burge, Tyler
Link: https://iep.utm.edu/tyler-burge/

Título: Butler, Joseph
Link: https://iep.utm.edu/joseph-butler/

Título: Caird, Edward
Link: https://iep.utm.edu/edward-caird/

Título: Calvin, John
Link: https://iep.utm.edu/john-calvin/

Título: Camus, Albert
Link: https://iep.utm.edu/albert-camus/

Título: Capital Punishment
Link: https://iep.utm.edu/death-penalty-capital-punishment/

Título: Care Ethics
Link: https://iep.utm.edu/care-ethics/

Título: Carnap, Rudolf
Link: https://iep.utm.edu/rudolf-carnap/

Título: Modal Logic
Link: https://iep.utm.edu/rudolf-carnap-modal-logic/

Título: Carroll, Lewis: Logic
Link: https://iep.utm.edu/lewis-carroll-logic/

Título: Cassirer, Ernst
Link: https://iep.utm.edu/ernst-cassirer/

Título: Castoriadis, Cornelius
Link: https://iep.utm.edu/cornelius-castoriadis/

Título: Causal Exclusion Problem, Mind and the
Link: https://iep.utm.edu/mind-and-the-causal-exclusion-problem/

Título: Causation
Link: https://iep.utm.edu/causation/

Título: Causation, Hume on
Link: https://iep.utm.edu/hume-causation/

Título: Cavendish, Margaret
Link: https://iep.utm.edu/margaret-cavendish/

Título: Certainty
Link: https://iep.utm.edu/certainty/

Título: Chang Tsai (Zhang Zai)
Link: https://iep.utm.edu/zhang-zai-chang-tsai/

Título: Change, Scientific
Link: https://iep.utm.edu/scientific-change/

Título: Chemistry, Reduction and Emergence in
Link: https://iep.utm.edu/reduction-and-emergence-in-chemistry/

Título: Cheng Hao (Cheng Mingdao)
Link: https://iep.utm.edu/cjemg-omgdap-cheng-hao-neo-confucian/

Título: Cheng Yi
Link: https://iep.utm.edu/chengyi/

Título: Chinese Philosophy
Link: https://iep.utm.edu/chinese-philosophy-overview-of-topics/

Título: Gender
Link: https://iep.utm.edu/gender-in-chinese-philosophy/

Título: Modern
Link: https://iep.utm.edu/modern-chinese-philosophy/

Título: Overview of History
Link: https://iep.utm.edu/chinese-philosophy-overview-of-history/

Título: Overview of Topics
Link: https://iep.utm.edu/chinese-philosophy-overview-of-topics/

Título: Chinese Room Argument
Link: https://iep.utm.edu/chinese-room-argument/

Título: Chisholm’s Epistemology
Link: https://iep.utm.edu/roderick-chisholm-epistemology/

Título: Chomsky, Noam
Link: https://iep.utm.edu/chomsky-philosophy/

Título: Christian Philosophy: The 1930s French Debates
Link: https://iep.utm.edu/christian-philosophy-1930s-french-debate/

Título: Chrysippus
Link: https://iep.utm.edu/chrysippus/

Título: Chu Hsi (Zhu Xi)
Link: https://iep.utm.edu/zhu-xi-chu-hsi-chinese-philosopher/

Título: Chuang-Tzu (Zhuangzi)
Link: https://iep.utm.edu/zhuangzi-chuang-tzu-chinese-philosopher/

Título: Chung Hui (Zhong Hui)
Link: https://iep.utm.edu/zhong-hui-chung-hui-chinese-philosopher/

Título: Cicero
Link: https://iep.utm.edu/cicero-roman-philosopher/

Título: Academic Skepticism
Link: https://iep.utm.edu/cicero-academic-skepticism/

Título: Classical Music, The Aesthetics of
Link: https://iep.utm.edu/aesthetics-of-classical-music/

Título: Classification
Link: https://iep.utm.edu/classification-in-science/

Título: Climate Science, The Philosophy of
Link: https://iep.utm.edu/philosophy-of-climate-science/

Título: Cloning
Link: https://iep.utm.edu/cloning/

Título: Cockburn, Catharine Trotter
Link: https://iep.utm.edu/catharine-trotter-cockburn/

Título: Cognition, Embodied
Link: https://iep.utm.edu/embodied-cognition/

Título: Cognitive Penetrability of Perception and Epistemic Justification
Link: https://iep.utm.edu/cognitive-penetrability-of-perception-and-epistemic-justification/

Título: Cognitive Phenomenology
Link: https://iep.utm.edu/cognitive-phenomenology/

Título: Cognitive Relativism
Link: https://iep.utm.edu/cognitive-relativism-truth/

Título: Coherentism in Epistemology
Link: https://iep.utm.edu/coherentism-in-epistemology/

Título: Collective Intentionality
Link: https://iep.utm.edu/collective-intentionality/

Título: Collective Moral Responsibility
Link: https://iep.utm.edu/collective-moral-responsibility/

Título: Color
Link: https://iep.utm.edu/color/

Título: Communication, Meaning and
Link: https://iep.utm.edu/meaning-and-communication/

Título: Compactness Theorem
Link: https://iep.utm.edu/compactness/

Título: Comparative Philosophy
Link: https://iep.utm.edu/comparative-philosophy/

Título: Compositionality in Language
Link: https://iep.utm.edu/compositionality-in-language/

Título: Computational Theory of Mind
Link: https://iep.utm.edu/computational-theory-of-mind/

Título: Concepts
Link: https://iep.utm.edu/concepts/

Título: Classical Theory
Link: https://iep.utm.edu/classical-theory-of-concepts/

Título: Theory-Theory
Link: https://iep.utm.edu/theory-theory-of-concepts/

Título: Conceptual Role Semantics
Link: https://iep.utm.edu/conceptual-role-semantics/

Título: Confirmation and Induction
Link: https://iep.utm.edu/confirmation-and-induction/

Título: Confucius
Link: https://iep.utm.edu/confucius/

Título: Confucian Philosophy: Neo-Confucian Philosophy
Link: https://iep.utm.edu/neo-confucian-philosophy/

Título: Connectionism
Link: https://iep.utm.edu/connectionism-cognition/

Título: Consciousness
Link: https://iep.utm.edu/consciousness/

Título: Hard Problem
Link: https://iep.utm.edu/hard-problem-of-conciousness/

Título: Higher-Order Theories
Link: https://iep.utm.edu/higher-order-theories-of-consciousness/

Título: Integrated Information Theory
Link: https://iep.utm.edu/integrated-information-theory-of-consciousness/

Título: Consequentialism
Link: https://iep.utm.edu/consequentialism-utilitarianism/

Título: Consequentialism, Epistemic
Link: https://iep.utm.edu/epistemic-consequentialism/

Título: Conspiracy Theories
Link: https://iep.utm.edu/conspiracy-theories/

Título: Constrastivism, Ethics and
Link: https://iep.utm.edu/ethics-and-contrastivism/

Título: Constructive Mathematics
Link: https://iep.utm.edu/constructive-mathematics/

Título: Constructivisim in Metaethics
Link: https://iep.utm.edu/constructivism-in-metaethics/

Título: Constructivisim in Metaphysics
Link: https://iep.utm.edu/constructivism-in-metaphysics/

Título: Constructivism, Political
Link: https://iep.utm.edu/political-constructivism/

Título: Contextualism in Epistemology
Link: https://iep.utm.edu/contextualism-in-epistemology/

Título: Continental Rationalism
Link: https://iep.utm.edu/continental-rationalism/

Título: Contrary-to-Duty Paradox
Link: https://iep.utm.edu/contrary-to-duty-paradox/

Título: Criterion, Problem of the
Link: https://iep.utm.edu/problem-of-the-criterion/

Título: Critias
Link: https://iep.utm.edu/critias/

Título: Critical Rationalism, Karl Popper and
Link: https://iep.utm.edu/karl-popper-critical-ratiotionalism/

Título: Critical Theory and the Frankfurt School
Link: https://iep.utm.edu/critical-theory-frankfurt-school/

Título: Critical Thinking
Link: https://iep.utm.edu/critical-thinking/

Título: Cudworth, Ralph
Link: https://iep.utm.edu/ralph-cudworth/

Título: Curry, Haskell Brooks
Link: https://iep.utm.edu/haskell-brooks-curry/

Título: Cynics
Link: https://iep.utm.edu/cynics/

Título: Cyrenaics
Link: https://iep.utm.edu/cyrenaics/
`;

const SEP_DATA = `
*   [**Experimental Jurisprudence**](https://plato.stanford.edu/entries/experimental-jurisprudence/) [_June 11, 2025_]
*   [**Empirical Approaches to Moral Responsibility**](https://plato.stanford.edu/entries/moral-responsibility-empirical/) [_June 11, 2025_]
*   [**The Ethics of Abortion**](https://plato.stanford.edu/entries/abortion/) [_May 14, 2025_]
*   [**Dai Zhen**](https://plato.stanford.edu/entries/dai-zhen/) [_May 2, 2025_]
*   [**George Eliot**](https://plato.stanford.edu/entries/george-eliot/) [_April 28, 2025_]
*   [**Branching Time**](https://plato.stanford.edu/entries/branching-time/) [_April 7, 2025_]
*   [**Mexican Existentialism**](https://plato.stanford.edu/entries/existentialism-mexican/) [_March 29, 2025_]
*   [**Aesthetics in Critical Theory**](https://plato.stanford.edu/entries/aesthetics-critical-theory/) [_March 25, 2025_]
*   [**Dehumanization**](https://plato.stanford.edu/entries/dehumanization/) [_March 24, 2025_]
*   [**Prioritarianism as a Theory of Value**](https://plato.stanford.edu/entries/prioritarianism/) [_March 24, 2025_]
*   [**Comparative Philosophy of Religion**](https://plato.stanford.edu/entries/religion-comparative/) [_March 19, 2025_]
*   [**Edith Landmann-Kalischer**](https://plato.stanford.edu/entries/landmann-kalischer/) [_March 18, 2025_]
*   [**Ideology**](https://plato.stanford.edu/entries/ideology/) [_March 7, 2025_]
*   [**The Textual Transmission of the Aristotelian Corpus**](https://plato.stanford.edu/entries/aristotle-text/) [_March 7, 2025_]
*   [**Maria Montessori**](https://plato.stanford.edu/entries/montessori-maria/) [_February 23, 2025_]
*   [**Nietzsche’s Aesthetics**](https://plato.stanford.edu/entries/nietzsche-aesthetics/) [_February 14, 2025_]
*   [**Realism and Anti-Realism about Metaphysics**](https://plato.stanford.edu/entries/realism-about-metaphysics/) [_February 10, 2025_]
*   [**Paradox of Tragedy**](https://plato.stanford.edu/entries/paradox-of-tragedy/) [_January 13, 2025_]
*   [**Animal Social Cognition**](https://plato.stanford.edu/entries/animal-social-cognition/) [_December 5, 2024_]
*   [**Philanthropy**](https://plato.stanford.edu/entries/philanthropy/) [_November 12, 2024_]
*   [**Reason and Religious Commitment**](https://plato.stanford.edu/entries/religious-commitment-reason/) [_November 5, 2024_]
*   [**ʿAyn al-Qudat**](https://plato.stanford.edu/entries/al-qudat/) [_October 30, 2024_]
*   [**Animal Communication**](https://plato.stanford.edu/entries/animal-communication/) [_October 23, 2024_]
*   [**Experimental Philosophy of Art and Aesthetics**](https://plato.stanford.edu/entries/experimental-aesthetics/) [_October 22, 2024_]
*   [**Locke on Medicine**](https://plato.stanford.edu/entries/locke-on-medicine/) [_October 14, 2024_]
*   [**Johannes Clauberg**](https://plato.stanford.edu/entries/clauberg/) [_October 9, 2024_]
*   [**Trans Philosophy**](https://plato.stanford.edu/entries/trans/) [_October 8, 2024_]
*   [**Common Ground in Pragmatics**](https://plato.stanford.edu/entries/common-ground-pragmatics/) [_October 3, 2024_]
*   [**Doxastic Voluntarism**](https://plato.stanford.edu/entries/doxastic-voluntarism/) [_October 1, 2024_]
*   [**Sign Language Semantics**](https://plato.stanford.edu/entries/sign-language-semantics/) [_September 9, 2024_]
*   [**Korean Buddhism**](https://plato.stanford.edu/entries/korean-buddhism/) [_September 5, 2024_]
*   [**Essence and Existence in Arabic and Islamic Philosophy**](https://plato.stanford.edu/entries/arabic-islamic-essence/) [_August 24, 2024_]
*   [**Theodicies**](https://plato.stanford.edu/entries/theodicies/) [_August 8, 2024_]
*   [**Yogācāra**](https://plato.stanford.edu/entries/yogacara/) [_July 7, 2024_]
*   [**Moral Demands and Permissions/Prerogatives**](https://plato.stanford.edu/entries/moral-demands-permissions/) [_June 27, 2024_]
*   [**Bernard Mandeville**](https://plato.stanford.edu/entries/mandeville/) [_June 3, 2024_]
*   [**Ibn Taymiyya**](https://plato.stanford.edu/entries/ibn-taymiyya/) [_May 22, 2024_]
*   [**John Italos**](https://plato.stanford.edu/entries/john-italos/) [_May 13, 2024_]
*   [**Lambert of Auxerre**](https://plato.stanford.edu/entries/lambert-auxerre/) [_April 3, 2024_]
*   [**Aesthetic Testimony**](https://plato.stanford.edu/entries/aesthetic-testimony/) [_March 13, 2024_]
*   [**Moral Decision-Making Under Uncertainty**](https://plato.stanford.edu/entries/moral-decision-uncertainty/) [_March 13, 2024_]
*   [**Bradley’s Moral Philosophy**](https://plato.stanford.edu/entries/bradley-moral/) [_March 6, 2024_]
*   [**Ruth Barcan Marcus**](https://plato.stanford.edu/entries/ruth-barcan-marcus/) [_March 5, 2024_]
*   [**Heritability**](https://plato.stanford.edu/entries/heritability/) [_February 27, 2024_]
*   [**Emotional Responses to Fiction**](https://plato.stanford.edu/entries/fiction-emotion-response/) [_February 21, 2024_]
*   [**Constructivism in Political Philosophy**](https://plato.stanford.edu/entries/constructivism-political/) [_February 6, 2024_]
*   [**Reverse Mathematics**](https://plato.stanford.edu/entries/reverse-mathematics/) [_February 2, 2024_]
*   [**Modern Confucianism**](https://plato.stanford.edu/entries/confucianism-modern/) [_December 11, 2023_]
*   [**Henry Habberley Price**](https://plato.stanford.edu/entries/price/) [_November 4, 2023_]
*   [**Inner Speech**](https://plato.stanford.edu/entries/inner-speech/) [_September 14, 2023_]
*   [**Structural Rationality**](https://plato.stanford.edu/entries/rationality-structural/) [_September 13, 2023_]
*   [**Agent-Based Modeling in the Philosophy of Science**](https://plato.stanford.edu/entries/agent-modeling-philscience/) [_September 7, 2023_]
*   [**Methods in Comparative Cognition**](https://plato.stanford.edu/entries/comparative-cognition/) [_September 6, 2023_]
*   [**Deductivism in the Philosophy of Mathematics**](https://plato.stanford.edu/entries/deductivism-mathematics/) [_August 25, 2023_]
*   [**Philosophy of Biology in Latin America**](https://plato.stanford.edu/entries/phil-bio-latin-america/) [_August 21, 2023_]
*   [**Meritocracy**](https://plato.stanford.edu/entries/meritocracy/) [_August 3, 2023_]
*   [**Mind (Heart-Mind) in Chinese Philosophy**](https://plato.stanford.edu/entries/chinese-mind/) [_July 10, 2023_]
*   [**Transformative Experience**](https://plato.stanford.edu/entries/transformative-experience/) [_June 1, 2023_]
*   [**Arabic and Islamic Philosophy of Religion**](https://plato.stanford.edu/entries/arabic-islamic-religion/) [_May 31, 2023_]
*   [**Propositional Logic**](https://plato.stanford.edu/entries/logic-propositional/) [_May 18, 2023_]
*   [**Atonement**](https://plato.stanford.edu/entries/atonement/) [_April 5, 2023_]
*   [**Solidarity in Social and Political Philosophy**](https://plato.stanford.edu/entries/solidarity/) [_March 25, 2023_]
*   [**Causal Approaches to Scientific Explanation**](https://plato.stanford.edu/entries/causal-explanation-science/) [_March 17, 2023_]
*   [**Gender in Confucian Philosophy**](https://plato.stanford.edu/entries/confucian-gender/) [_February 27, 2023_]
*   [**Dignity**](https://plato.stanford.edu/entries/dignity/) [_February 18, 2023_]
*   [**Creativity**](https://plato.stanford.edu/entries/creativity/) [_February 16, 2023_]
*   [**Jaina Philosophy**](https://plato.stanford.edu/entries/jaina-philosophy/) [_February 13, 2023_]
*   [**Frege’s Logic**](https://plato.stanford.edu/entries/frege-logic/) [_February 7, 2023_]
*   [**Fakhr al-Din al-Razi**](https://plato.stanford.edu/entries/al-din-al-razi/) [_February 5, 2023_]
*   [**Ernst Bloch**](https://plato.stanford.edu/entries/bloch/) [_January 25, 2023_]
*   [**Aesthetic Experience**](https://plato.stanford.edu/entries/aesthetic-experience/) [_January 20, 2023_]
*   [**Alexander von Humboldt**](https://plato.stanford.edu/entries/alexander-humboldt/) [_January 16, 2023_]
*   [**Antonio Gramsci**](https://plato.stanford.edu/entries/gramsci/) [_January 13, 2023_]
*   [**Many-Sorted Logic**](https://plato.stanford.edu/entries/logic-many-sorted/) [_December 15, 2022_]
*   [**The Possibilism-Actualism Debate**](https://plato.stanford.edu/entries/possibilism-actualism/) [_November 28, 2022_]
*   [**Self-Locating Beliefs**](https://plato.stanford.edu/entries/self-locating-beliefs/) [_September 30, 2022_]
*   [**Higher-Order Evidence**](https://plato.stanford.edu/entries/higher-order-evidence/) [_September 6, 2022_]
*   [**Analytical Marxism**](https://plato.stanford.edu/entries/marxism-analytical/) [_September 5, 2022_]
*   [**Consequentializing**](https://plato.stanford.edu/entries/consequentializing/) [_August 22, 2022_]
*   [**Margarete Susman**](https://plato.stanford.edu/entries/susman-margarete/) [_August 20, 2022_]
*   [**Natural Language Ontology**](https://plato.stanford.edu/entries/natural-language-ontology/) [_August 17, 2022_]
*   [**Normativity in Metaethics**](https://plato.stanford.edu/entries/normativity-metaethics/) [_July 12, 2022_]
*   [**Moral Theory**](https://plato.stanford.edu/entries/moral-theory/) [_June 27, 2022_]
*   [**The Moral/Conventional Distinction**](https://plato.stanford.edu/entries/moral-conventional/) [_June 8, 2022_]
*   [**Theories of Biological Development**](https://plato.stanford.edu/entries/theories-biological-development/) [_June 3, 2022_]
*   [**Primary and Secondary Qualities in Early Modern Philosophy**](https://plato.stanford.edu/entries/qualities-prim-sec/) [_June 1, 2022_]
*   [**Normative Theories of Rational Choice: Rivals to Expected Utility**](https://plato.stanford.edu/entries/rationality-normative-nonutility/) [_May 16, 2022_]
*   [**Philosophy of International Law**](https://plato.stanford.edu/entries/international-law/) [_May 12, 2022_]
*   [**Gómez Pereira**](https://plato.stanford.edu/entries/gomez-pereira/) [_April 19, 2022_]
*   [**Rosa Luxemburg**](https://plato.stanford.edu/entries/luxemburg/) [_April 13, 2022_]
*   [**Rule-Following and Intentionality**](https://plato.stanford.edu/entries/rule-following/) [_April 12, 2022_]
*   [**Arabic and Islamic Philosophy of Mathematics**](https://plato.stanford.edu/entries/arabic-islamic-phil-math/) [_April 9, 2022_]
*   [**Aesthetics and Cognitive Science**](https://plato.stanford.edu/entries/aesthetics-cogsci/) [_April 3, 2022_]
*   [**The Concept of Religion**](https://plato.stanford.edu/entries/concept-religion/) [_March 28, 2022_]
*   [**Iris Murdoch**](https://plato.stanford.edu/entries/murdoch/) [_March 23, 2022_]
*   [**Metaepistemology**](https://plato.stanford.edu/entries/metaepistemology/) [_March 9, 2022_]
*   [**Obligations to Oneself**](https://plato.stanford.edu/entries/self-obligations/) [_January 25, 2022_]
*   [**Hate Speech**](https://plato.stanford.edu/entries/hate-speech/) [_January 25, 2022_]
*   [**Cicero**](https://plato.stanford.edu/entries/cicero/) [_January 14, 2022_]
*   [**Korean Philosophy**](https://plato.stanford.edu/entries/korean-philosophy/) [_January 14, 2022_]
*   [**Philosophical Approaches to Work and Labor**](https://plato.stanford.edu/entries/work-labor/) [_January 11, 2022_]
*   [**Economics in Early Modern Philosophy**](https://plato.stanford.edu/entries/economics-early-modern/) [_January 10, 2022_]
*   [**Spinoza’s Epistemology and Philosophy of Mind**](https://plato.stanford.edu/entries/spinoza-epistemology-mind/) [_January 10, 2022_]
*   [**Philosophy in Han Dynasty China**](https://plato.stanford.edu/entries/han-dynasty/) [_January 3, 2022_]
*   [**Personhood in Classical Indian Philosophy**](https://plato.stanford.edu/entries/personhood-india/) [_January 3, 2022_]
*   [**God and Other Ultimates**](https://plato.stanford.edu/entries/god-ultimates/) [_December 17, 2021_]
*   [**Kinds and Origins of Evil**](https://plato.stanford.edu/entries/evil-kinds-origins/) [_December 10, 2021_]
*   [**Phylogenetic Inference**](https://plato.stanford.edu/entries/phylogenetic-inference/) [_December 8, 2021_]
*   [**Moral Disagreement**](https://plato.stanford.edu/entries/disagreement-moral/) [_December 8, 2021_]
*   [**The Emotions in Early Chinese Philosophy**](https://plato.stanford.edu/entries/emotions-chinese/) [_December 6, 2021_]
*   [**Aristotle’s Aesthetics**](https://plato.stanford.edu/entries/aristotle-aesthetics/) [_December 3, 2021_]
*   [**Korean Confucianism**](https://plato.stanford.edu/entries/korean-confucianism/) [_November 24, 2021_]
*   [**Philosophy of Contract Law**](https://plato.stanford.edu/entries/contract-law/) [_November 23, 2021_]
*   [**al-Farabi’s Metaphysics**](https://plato.stanford.edu/entries/al-farabi-metaphysics/) [_November 22, 2021_]
*   [**Ecological Genetics**](https://plato.stanford.edu/entries/ecological-genetics/) [_November 19, 2021_]
*   [**Jury Theorems**](https://plato.stanford.edu/entries/jury-theorems/) [_November 17, 2021_]
*   [**Scientific Pluralism**](https://plato.stanford.edu/entries/scientific-pluralism/) [_November 3, 2021_]
*   [**Natural Deduction Systems in Logic**](https://plato.stanford.edu/entries/natural-deduction/) [_October 29, 2021_]
*   [**Alonzo Church**](https://plato.stanford.edu/entries/church/) [_October 21, 2021_]
*   [**Metaphysical Explanation**](https://plato.stanford.edu/entries/metaphysical-explanation/) [_October 21, 2021_]
*   [**Śaṅkara**](https://plato.stanford.edu/entries/shankara/) [_October 4, 2021_]
*   [**Critical Philosophy of Race**](https://plato.stanford.edu/entries/critical-phil-race/) [_September 15, 2021_]
*   [**Moral Phenomenology**](https://plato.stanford.edu/entries/moral-phenomenology/) [_August 25, 2021_]
*   [**Contemporary Africana Philosophy**](https://plato.stanford.edu/entries/africana-contemporary/) [_August 9, 2021_]
*   [**Regularity and Inferential Theories of Causation**](https://plato.stanford.edu/entries/causation-regularity/) [_July 27, 2021_]
*   [**Public Goods**](https://plato.stanford.edu/entries/public-goods/) [_July 21, 2021_]
*   [**Absolute and Relational Space and Motion: Classical Theories**](https://plato.stanford.edu/entries/spacetime-theories-classical/) [_July 19, 2021_]
*   [**Argument and Argumentation**](https://plato.stanford.edu/entries/argument/) [_July 16, 2021_]
*   [**History of Western Philosophy of Music: since 1800**](https://plato.stanford.edu/entries/hist-westphilmusic-since-1800/) [_July 13, 2021_]
*   [**History of Western Philosophy of Music: Antiquity to 1800**](https://plato.stanford.edu/entries/hist-westphilmusic-to-1800/) [_July 13, 2021_]
*   [**Legal Interpretation**](https://plato.stanford.edu/entries/legal-interpretation/) [_July 7, 2021_]
*   [**Self-Defense**](https://plato.stanford.edu/entries/self-defense/) [_June 29, 2021_]
*   [**Ibn Rushd \[Averroes\]**](https://plato.stanford.edu/entries/ibn-rushd/) [_June 23, 2021_]
*   [**Neoliberalism**](https://plato.stanford.edu/entries/neoliberalism/) [_June 9, 2021_]
*   [**Legal Probabilism**](https://plato.stanford.edu/entries/legal-probabilism/) [_June 8, 2021_]
*   [**Hegel’s Social and Political Philosophy**](https://plato.stanford.edu/entries/hegel-social-political/) [_June 3, 2021_]
*   [**Margaret Fuller**](https://plato.stanford.edu/entries/fuller-margaret/) [_May 25, 2021_]
*   [**Abu Bakr al-Razi**](https://plato.stanford.edu/entries/abu-bakr-al-razi/) [_May 19, 2021_]
*   [**Ralph Cudworth**](https://plato.stanford.edu/entries/cudworth/) [_May 7, 2021_]
*   [**Understanding**](https://plato.stanford.edu/entries/understanding/) [_May 6, 2021_]
*   [**Infinity**](https://plato.stanford.edu/entries/infinity/) [_April 29, 2021_]
*   [**Francis Hutcheson**](https://plato.stanford.edu/entries/hutcheson/) [_April 20, 2021_]
*   [**Sin in Christian Thought**](https://plato.stanford.edu/entries/sin-christian/) [_April 15, 2021_]
*   [**Human Nature**](https://plato.stanford.edu/entries/human-nature/) [_March 15, 2021_]
*   [**Feminist Perspectives on Argumentation**](https://plato.stanford.edu/entries/feminism-argumentation/) [_February 18, 2021_]
*   [**Hyperintensionality**](https://plato.stanford.edu/entries/hyperintensionality/) [_February 8, 2021_]
*   [**Culture**](https://plato.stanford.edu/entries/culture/) [_December 2, 2020_]
*   [**Ancient Theories of Freedom and Determinism**](https://plato.stanford.edu/entries/freedom-ancient/) [_October 30, 2020_]
*   [**Protagoras**](https://plato.stanford.edu/entries/protagoras/) [_September 8, 2020_]
*   [**Boethius of Dacia**](https://plato.stanford.edu/entries/boethius-dacia/) [_September 7, 2020_]
*   [**The Psychology of Normative Cognition**](https://plato.stanford.edu/entries/psychology-normative-cognition/) [_August 25, 2020_]
*   [**Causation in Physics**](https://plato.stanford.edu/entries/causation-physics/) [_August 24, 2020_]
*   [**Isaac Albalag**](https://plato.stanford.edu/entries/albalag/) [_August 20, 2020_]
*   [**Philosophy of Microbiology**](https://plato.stanford.edu/entries/microbiology/) [_August 12, 2020_]
*   [**Luther’s Influence on Philosophy**](https://plato.stanford.edu/entries/luther-influence/) [_July 22, 2020_]
*   [**Martin Luther**](https://plato.stanford.edu/entries/luther/) [_July 22, 2020_]
*   [**Divine Revelation**](https://plato.stanford.edu/entries/divine-revelation/) [_July 17, 2020_]
*   [**Moral Responsibility and the Principle of Alternative Possibilities**](https://plato.stanford.edu/entries/alternative-possibilities/) [_July 9, 2020_]
*   [**Evolution and Development**](https://plato.stanford.edu/entries/evolution-development/) [_July 8, 2020_]
*   [**Gaṅgeśa**](https://plato.stanford.edu/entries/gangesa/) [_June 18, 2020_]
*   [**Climate Justice**](https://plato.stanford.edu/entries/justice-climate/) [_June 4, 2020_]
*   [**Simplicius**](https://plato.stanford.edu/entries/simplicius/) [_June 3, 2020_]
*   [**Descartes’ Method**](https://plato.stanford.edu/entries/descartes-method/) [_June 3, 2020_]
*   [**Scientific Research and Big Data**](https://plato.stanford.edu/entries/science-big-data/) [_May 29, 2020_]
*   [**Kantian Conceptualism/Nonconceptualism**](https://plato.stanford.edu/entries/kant-conceptualism/) [_May 27, 2020_]
*   [**Wilhelm Windelband**](https://plato.stanford.edu/entries/wilhelm-windelband/) [_May 18, 2020_]
*   [**Ethics of Artificial Intelligence and Robotics**](https://plato.stanford.edu/entries/ethics-ai/) [_April 30, 2020_]
*   [**Imaginative Resistance**](https://plato.stanford.edu/entries/imaginative-resistance/) [_April 13, 2020_]
*   [**Philosophy of Biomedicine**](https://plato.stanford.edu/entries/biomedicine/) [_April 9, 2020_]
*   [**Francisco Sanches**](https://plato.stanford.edu/entries/francisco-sanches/) [_March 31, 2020_]
*   [**Territorial Rights and Territorial Justice**](https://plato.stanford.edu/entries/territorial-rights/) [_March 24, 2020_]
*   [**Song-Ming Confucianism**](https://plato.stanford.edu/entries/song-ming-confucianism/) [_March 19, 2020_]
*   [**Edith Stein**](https://plato.stanford.edu/entries/stein/) [_March 18, 2020_]
*   [**Computational Philosophy**](https://plato.stanford.edu/entries/computational-philosophy/) [_March 16, 2020_]
*   [**Johann Sturm**](https://plato.stanford.edu/entries/johann-sturm/) [_March 5, 2020_]
*   [**Rudolf Carnap**](https://plato.stanford.edu/entries/carnap/) [_February 24, 2020_]
*   [**Philosophy of Sport**](https://plato.stanford.edu/entries/sport/) [_February 4, 2020_]
*   [**Hans Vaihinger**](https://plato.stanford.edu/entries/vaihinger/) [_January 23, 2020_]
*   [**Gustav Theodor Fechner**](https://plato.stanford.edu/entries/fechner/) [_January 12, 2020_]
*   [**Empirical Approaches to Altruism**](https://plato.stanford.edu/entries/altruism-empirical/) [_January 6, 2020_]
*   [**Richard Sylvan \[Routley\]**](https://plato.stanford.edu/entries/sylvan-routley/) [_December 9, 2019_]
*   [**Sophie de Grouchy**](https://plato.stanford.edu/entries/sophie-de-grouchy/) [_December 5, 2019_]
*   [**Philosophy of Theater**](https://plato.stanford.edu/entries/theater/) [_November 22, 2019_]
*   [**Jean-Baptiste Du Bos**](https://plato.stanford.edu/entries/du-bos/) [_November 19, 2019_]
*   [**Structuralism in the Philosophy of Mathematics**](https://plato.stanford.edu/entries/structuralism-mathematics/) [_November 18, 2019_]
*   [**Huayan Buddhism**](https://plato.stanford.edu/entries/buddhism-huayan/) [_November 5, 2019_]
*   [**Philosophy of Cell Biology**](https://plato.stanford.edu/entries/cell-biology/) [_October 15, 2019_]
*   [**Richard Price**](https://plato.stanford.edu/entries/richard-price/) [_October 3, 2019_]
*   [**Critical Disability Theory**](https://plato.stanford.edu/entries/disability-critical/) [_September 23, 2019_]
*   [**Natural Properties**](https://plato.stanford.edu/entries/natural-properties/) [_September 13, 2019_]
*   [**Iamblichus**](https://plato.stanford.edu/entries/iamblichus/) [_August 27, 2019_]
*   [**John Niemeyer Findlay**](https://plato.stanford.edu/entries/findlay/) [_August 22, 2019_]
*   [**Frank Ramsey**](https://plato.stanford.edu/entries/ramsey/) [_August 14, 2019_]
*   [**Genetics**](https://plato.stanford.edu/entries/genetics/) [_August 13, 2019_]
*   [**Socialism**](https://plato.stanford.edu/entries/socialism/) [_July 15, 2019_]
*   [**Category Mistakes**](https://plato.stanford.edu/entries/category-mistakes/) [_July 5, 2019_]
*   [**Russellian Monism**](https://plato.stanford.edu/entries/russellian-monism/) [_July 3, 2019_]
*   [**Denis Diderot**](https://plato.stanford.edu/entries/diderot/) [_June 19, 2019_]
*   [**Darwin: From the _Origin of Species_ to the _Descent of Man_**](https://plato.stanford.edu/entries/origin-descent/) [_June 17, 2019_]
*   [**Evolutionary Thought Before Darwin**](https://plato.stanford.edu/entries/evolution-before-darwin/) [_June 17, 2019_]
*   [**Retrocausality in Quantum Mechanics**](https://plato.stanford.edu/entries/qm-retrocausality/) [_June 3, 2019_]
*   [**Philosophical Aspects of Multi-Modal Logic**](https://plato.stanford.edu/entries/phil-multimodallogic/) [_June 3, 2019_]
*   [**Philosophy of Macroevolution**](https://plato.stanford.edu/entries/macroevolution/) [_June 3, 2019_]
*   [**Ramsey and Intergenerational Welfare Economics**](https://plato.stanford.edu/entries/ramsey-economics/) [_June 1, 2019_]
*   [**Actualism and Possibilism in Ethics**](https://plato.stanford.edu/entries/actualism-possibilism-ethics/) [_May 20, 2019_]
*   [**Cancer**](https://plato.stanford.edu/entries/cancer/) [_May 7, 2019_]
*   [**Freedom of Association**](https://plato.stanford.edu/entries/freedom-association/) [_May 3, 2019_]
*   [**al-Farabi’s Philosophy of Logic and Language**](https://plato.stanford.edu/entries/al-farabi-logic/) [_April 16, 2019_]
*   [**Qing Philosophy**](https://plato.stanford.edu/entries/qing-philosophy/) [_April 16, 2019_]
*   [**Treating Persons as Means**](https://plato.stanford.edu/entries/persons-means/) [_April 13, 2019_]
*   [**Needs in Moral and Political Philosophy**](https://plato.stanford.edu/entries/needs/) [_April 11, 2019_]
*   [**Japanese Philosophy**](https://plato.stanford.edu/entries/japanese-philosophy/) [_April 5, 2019_]
*   [**Chinese Philosophy of Change (Yijing)**](https://plato.stanford.edu/entries/chinese-change/) [_March 29, 2019_]
*   [**School of Salamanca**](https://plato.stanford.edu/entries/school-salamanca/) [_March 22, 2019_]
*   [**The Pragmatic Theory of Truth**](https://plato.stanford.edu/entries/truth-pragmatic/) [_March 21, 2019_]
*   [**Frantz Fanon**](https://plato.stanford.edu/entries/frantz-fanon/) [_March 14, 2019_]
*   [**Hobbes’ Philosophy of Science**](https://plato.stanford.edu/entries/hobbes-science/) [_March 8, 2019_]
*   [**Logics for Analyzing Games**](https://plato.stanford.edu/entries/logics-for-games/) [_March 4, 2019_]
*   [**Mental Disorder (Illness)**](https://plato.stanford.edu/entries/mental-disorder/) [_February 20, 2019_]
*   [**Locke on Personal Identity**](https://plato.stanford.edu/entries/locke-personal-identity/) [_February 11, 2019_]
*   [**Counterfactuals**](https://plato.stanford.edu/entries/counterfactuals/) [_January 18, 2019_]
*   [**Latinx Philosophy**](https://plato.stanford.edu/entries/latinx/) [_December 13, 2018_]
*   [**Latin American Feminism**](https://plato.stanford.edu/entries/feminism-latin-america/) [_December 12, 2018_]
*   [**Reproducibility of Scientific Results**](https://plato.stanford.edu/entries/scientific-reproducibility/) [_December 3, 2018_]
*   [**Bounded Rationality**](https://plato.stanford.edu/entries/bounded-rationality/) [_November 30, 2018_]
*   [**The Emergence of First-Order Logic**](https://plato.stanford.edu/entries/logic-firstorder-emergence/) [_November 17, 2018_]
*   [**Domination**](https://plato.stanford.edu/entries/domination/) [_November 8, 2018_]
*   [**Fictional Entities**](https://plato.stanford.edu/entries/fictional-entities/) [_November 6, 2018_]
*   [**Philosophy of Money and Finance**](https://plato.stanford.edu/entries/money-finance/) [_November 2, 2018_]
*   [**John Dewey**](https://plato.stanford.edu/entries/dewey/) [_November 1, 2018_]
*   [**Modesty and Humility**](https://plato.stanford.edu/entries/modesty-humility/) [_October 31, 2018_]
*   [**The Neuroscience of Consciousness**](https://plato.stanford.edu/entries/consciousness-neuroscience/) [_October 9, 2018_]
*   [**Analytic Philosophy in Latin America**](https://plato.stanford.edu/entries/latin-american-analytic/) [_October 8, 2018_]
*   [**Jean François Lyotard**](https://plato.stanford.edu/entries/lyotard/) [_September 21, 2018_]
*   [**Moral Vegetarianism**](https://plato.stanford.edu/entries/vegetarianism/) [_September 14, 2018_]
*   [**The Epistemic Condition for Moral Responsibility**](https://plato.stanford.edu/entries/moral-responsibility-epistemic/) [_September 12, 2018_]
*   [**Personal Relationship Goods**](https://plato.stanford.edu/entries/personal-relationship-goods/) [_September 4, 2018_]
*   [**Alienation**](https://plato.stanford.edu/entries/alienation/) [_August 30, 2018_]
*   [**Heinrich Scholz**](https://plato.stanford.edu/entries/scholz/) [_August 29, 2018_]
*   [**Basil \[Cardinal\] Bessarion**](https://plato.stanford.edu/entries/bessarion/) [_August 27, 2018_]
*   [**Ibn Rushd’s Natural Philosophy**](https://plato.stanford.edu/entries/ibn-rushd-natural/) [_August 17, 2018_]
*   [**Philippa Foot**](https://plato.stanford.edu/entries/philippa-foot/) [_August 17, 2018_]
*   [**Ibn Sina’s Logic**](https://plato.stanford.edu/entries/ibn-sina-logic/) [_August 15, 2018_]
*   [**Proof Theory**](https://plato.stanford.edu/entries/proof-theory/) [_August 13, 2018_]
*   [**Causal Models**](https://plato.stanford.edu/entries/causal-models/) [_August 7, 2018_]
*   [**Critical Thinking**](https://plato.stanford.edu/entries/critical-thinking/) [_July 21, 2018_]
*   [**Fundamentality**](https://plato.stanford.edu/entries/fundamentality/) [_July 21, 2018_]
*   [**Infinite Regress Arguments**](https://plato.stanford.edu/entries/infinite-regress/) [_July 20, 2018_]
*   [**Prediction versus Accommodation**](https://plato.stanford.edu/entries/prediction-accommodation/) [_July 17, 2018_]
*   [**Wesley Salmon**](https://plato.stanford.edu/entries/wesley-salmon/) [_July 13, 2018_]
*   [**Artificial Intelligence**](https://plato.stanford.edu/entries/artificial-intelligence/) [_July 12, 2018_]
*   [**The Ethics of Cultural Heritage**](https://plato.stanford.edu/entries/ethics-cultural-heritage/) [_July 12, 2018_]
*   [**Epistemology in Latin America**](https://plato.stanford.edu/entries/epistemology-latin-america/) [_July 12, 2018_]
*   [**Sex and Sexuality**](https://plato.stanford.edu/entries/sex-sexuality/) [_July 5, 2018_]
*   [**Feminist Philosophy**](https://plato.stanford.edu/entries/feminist-philosophy/) [_June 28, 2018_]
*   [**Giordano Bruno**](https://plato.stanford.edu/entries/bruno/) [_May 30, 2018_]
`;

const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

const normalizeText = (text: string): string => {
    return text
        .toLowerCase()
        .normalize('NFD') // Decompose combined characters (e.g., 'é' -> 'e' + '´')
        .replace(/[\u0300-\u036f]/g, ''); // Remove diacritical marks
};


const parseIepData = (data: string): SourceArticle[] => {
    const articles: SourceArticle[] = [];
    const entries = data.trim().split('\n\n');
    for (const entry of entries) {
        const titleMatch = entry.match(/Título: (.*)/);
        const linkMatch = entry.match(/Link: (.*)/);
        if (titleMatch && linkMatch) {
            const title = titleMatch[1].trim();
            articles.push({
                id: `iep-${slugify(title)}`,
                source: 'IEP',
                title: title,
                url: linkMatch[1].trim(),
            });
        }
    }
    return articles;
};

const parseSepData = (data: string): SourceArticle[] => {
    const articles: SourceArticle[] = [];
    const lines = data.trim().split('\n');
    const regex = /^\s*\*\s*\[\*\*(.*?)\*\*\]\((.*?)\)/;
    for (const line of lines) {
        const match = line.match(regex);
        if (match) {
            const title = match[1].trim();
            articles.push({
                id: `sep-${slugify(title)}`,
                source: 'SEP',
                title: title,
                url: match[2].trim(),
            });
        }
    }
    return articles;
};

let allArticles: SourceArticle[] | null = null;
const getAllArticles = (): SourceArticle[] => {
    if (allArticles === null) {
        allArticles = [...parseIepData(IEP_DATA), ...parseSepData(SEP_DATA)];
    }
    return allArticles;
};

let articleMap: Map<string, SourceArticle> | null = null;
const getArticleMap = (): Map<string, SourceArticle> => {
    if (articleMap === null) {
        articleMap = new Map(getAllArticles().map(article => [article.id, article]));
    }
    return articleMap;
};

export const findRelevantArticles = (keywords: string[]): SourceArticle[] => {
    if (keywords.length === 0) return [];

    const normalizedKeywords = keywords.map(normalizeText);
    const keywordPartsSets = normalizedKeywords.map(k => new Set(k.split(/\s+/)));
    
    const articles = getAllArticles();
    
    const scoredArticles = articles.map(article => {
        const normalizedTitle = normalizeText(article.title);
        const titleWords = new Set(normalizedTitle.replace(/[^a-z0-9\s-]/g, '').split(/[\s-]+/));
        let score = 0;
        
        // Score based on keyword part intersection
        for (const keywordSet of keywordPartsSets) {
            let matches = 0;
            for (const part of keywordSet) {
                if (titleWords.has(part)) {
                    matches++;
                }
            }
            if (matches > 0) {
                score += (matches / keywordSet.size) * 5;
            }
        }
        
        // Bonus for matching full original keyword as substring
        for (const originalKeyword of normalizedKeywords) {
             if (normalizedTitle.includes(originalKeyword)) {
                score += 10;
             }
        }
        
        // Handle "Last, First" case for names
        for (const originalKeyword of normalizedKeywords) {
            const parts = originalKeyword.split(/\s+/);
            if (parts.length === 2) {
                const reversed = `${parts[1]}, ${parts[0]}`;
                if (normalizedTitle.includes(reversed)) {
                    score += 15; // High bonus for this specific format match
                }
            }
        }

        return { article, score };
    });

    return scoredArticles
        .filter(item => item.score > 2) // Filter out weak single-word matches
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(item => item.article);
};

export const getArticleById = (id: string): SourceArticle | undefined => {
    return getArticleMap().get(id);
};