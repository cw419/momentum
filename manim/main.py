"""
自制力科普视频 - Manim 动画
基于 Edmond 的《如何提高自制力？》文章
宣传 Momentum 项目

SVG 数据来源：manim/edmond图片/*.svg
"""

from manim import *
from styles import *
import numpy as np

# 全局配置
config.background_color = BACKGROUND_COLOR


class IntroScene(Scene):
    """Scene 1: 问题引入 - 学习 vs 刷手机的选择"""

    def construct(self):
        # 标题
        title = Text("如何提高自制力？", font=CHINESE_FONT, color=HIGHLIGHT_COLOR)
        title.scale(TITLE_SCALE)
        self.play(Write(title))
        self.wait(1)
        self.play(title.animate.to_edge(UP, buff=BUFF_MEDIUM))

        # 场景描述
        scene_desc = Text(
            "晚上7点，你坐在书桌前...",
            font=CHINESE_FONT,
            color=TEXT_COLOR
        ).scale(TEXT_SCALE)
        scene_desc.next_to(title, DOWN, buff=BUFF_LARGE)
        self.play(FadeIn(scene_desc))
        self.wait(1)

        # 创建选择图示
        self.play(FadeOut(scene_desc))
        self.show_choice_diagram()

        # 核心问题
        self.show_core_question()

    def show_choice_diagram(self):
        """展示学习 vs 刷手机的选择"""
        # 左边：学习
        book_icon = Text("📚", font="Segoe UI Emoji").scale(1.5)
        study_label = Text("学习", font=CHINESE_FONT, color=POSITIVE_COLOR).scale(0.6)
        study_group = VGroup(book_icon, study_label).arrange(DOWN, buff=0.2)
        study_group.shift(LEFT * 3)

        # 右边：刷手机
        phone_icon = Text("📱", font="Segoe UI Emoji").scale(1.5)
        phone_label = Text("刷手机", font=CHINESE_FONT, color=NEGATIVE_COLOR).scale(0.6)
        phone_group = VGroup(phone_icon, phone_label).arrange(DOWN, buff=0.2)
        phone_group.shift(RIGHT * 3)

        # 中间：VS
        vs_text = Text("VS", font=CHINESE_FONT, color=YELLOW_COLOR).scale(0.8)

        # 人物图标
        person = Text("🧑", font="Segoe UI Emoji").scale(1.2)
        person.shift(DOWN * 1.5)

        self.play(
            FadeIn(study_group),
            FadeIn(phone_group),
            Write(vs_text)
        )
        self.play(FadeIn(person))
        self.wait(1)

        # 显示选择结果
        result_text = Text(
            "99% 的人会选择...",
            font=CHINESE_FONT,
            color=TEXT_COLOR
        ).scale(0.55)
        result_text.next_to(person, DOWN, buff=0.4)
        self.play(Write(result_text))
        self.wait(0.5)

        # 箭头指向手机
        arrow = Arrow(
            person.get_right() + UP * 0.3,
            phone_group.get_left() + DOWN * 0.3,
            color=NEGATIVE_COLOR,
            buff=0.2
        )
        self.play(Create(arrow))
        self.wait(1)

        # 清理
        self.play(
            FadeOut(study_group),
            FadeOut(phone_group),
            FadeOut(vs_text),
            FadeOut(person),
            FadeOut(result_text),
            FadeOut(arrow)
        )

    def show_core_question(self):
        """展示核心问题"""
        question = Text(
            "为什么我们总是选择即时满足？",
            font=CHINESE_FONT,
            color=HIGHLIGHT_COLOR
        ).scale(0.7)

        self.play(Write(question))
        self.wait(1)

        # 答案提示
        hint = Text(
            "答案藏在一个简单的数学模型中...",
            font=CHINESE_FONT,
            color=TEXT_COLOR
        ).scale(0.55)
        hint.next_to(question, DOWN, buff=0.5)
        self.play(FadeIn(hint))
        self.wait(2)

        self.play(FadeOut(question), FadeOut(hint))


class MathModelScene(Scene):
    """Scene 2: 数学模型 - 基于 main.svg 精确复现"""

    def construct(self):
        # 标题
        title = Text("行为决策的数学模型", font=CHINESE_FONT, color=HIGHLIGHT_COLOR)
        title.scale(0.8).to_edge(UP, buff=BUFF_MEDIUM)
        self.play(Write(title))
        self.wait(0.5)

        # 核心公式展示
        self.show_formula(title)

        # 关键对比图：学习 vs 玩手机（精确复现 main.svg）
        self.show_study_vs_phone_svg_style()

        # 考前场景变化
        self.show_exam_scenario()

        # 结论
        self.show_conclusion()

    def show_formula(self, title):
        """展示核心积分公式"""
        formula = MathTex(
            r"I = \int_0^{+\infty} W(\tau) \cdot V(\tau) \, d\tau",
            color=TEXT_COLOR
        ).scale(FORMULA_SCALE)
        formula.next_to(title, DOWN, buff=0.5)

        self.play(Write(formula))
        self.wait(1)

        # 解释框
        explain_box = VGroup(
            VGroup(
                MathTex(r"I", color=YELLOW_COLOR).scale(0.5),
                Text(" = 行为倾向（积分面积）", font=CHINESE_FONT, color=TEXT_COLOR).scale(0.4)
            ).arrange(RIGHT, buff=0.1),
            VGroup(
                MathTex(r"W(\tau)", color=HIGHLIGHT_COLOR).scale(0.5),
                Text(" = 权重贴现函数（人类短视）", font=CHINESE_FONT, color=TEXT_COLOR).scale(0.4)
            ).arrange(RIGHT, buff=0.1),
            VGroup(
                MathTex(r"V(\tau)", color=NEGATIVE_COLOR).scale(0.5),
                Text(" = 未来价值函数", font=CHINESE_FONT, color=TEXT_COLOR).scale(0.4)
            ).arrange(RIGHT, buff=0.1),
        ).arrange(DOWN, buff=0.2, aligned_edge=LEFT)
        explain_box.next_to(formula, DOWN, buff=0.4)

        self.play(FadeIn(explain_box))
        self.wait(2)

        # 关键洞察
        insight = Text(
            "关键洞察：W(τ) 在近期很高，远期迅速衰减",
            font=CHINESE_FONT,
            color=YELLOW_COLOR
        ).scale(0.45)
        insight.next_to(explain_box, DOWN, buff=0.4)
        self.play(Write(insight))
        self.wait(1.5)

        self.play(
            FadeOut(formula),
            FadeOut(explain_box),
            FadeOut(insight)
        )

    def show_study_vs_phone_svg_style(self):
        """精确复现 main.svg 的布局和曲线"""

        # === 创建坐标系 ===
        # SVG 坐标：x: 60-330, y: 40-400, 零线在 y=240
        # 转换为 manim 坐标系

        axes_config = {
            "x_range": [0, 5.5, 1],
            "y_range": [-1.0, 1.0, 0.5],
            "x_length": 4.2,
            "y_length": 3.2,
            "axis_config": {"color": TEXT_COLOR, "include_tip": True, "tip_length": 0.15},
        }

        # 左图：去学习
        axes_left = Axes(**axes_config).scale(0.65)
        axes_left.shift(LEFT * 3.2)

        # 右图：玩手机
        axes_right = Axes(**axes_config).scale(0.65)
        axes_right.shift(RIGHT * 3.2)

        # 标题
        left_title = Text("去学习", font=CHINESE_FONT, color=TEXT_COLOR, weight=BOLD).scale(0.55)
        left_title.next_to(axes_left, UP, buff=0.3)
        right_title = Text("玩手机", font=CHINESE_FONT, color=TEXT_COLOR, weight=BOLD).scale(0.55)
        right_title.next_to(axes_right, UP, buff=0.3)

        # 边框（霓虹灯效果）
        left_border = SurroundingRectangle(
            VGroup(axes_left, left_title),
            color=NEGATIVE_COLOR,  # 红色边框
            buff=0.2,
            stroke_width=4
        )
        right_border = SurroundingRectangle(
            VGroup(axes_right, right_title),
            color=POSITIVE_COLOR,  # 绿色边框
            buff=0.2,
            stroke_width=4
        )

        # 轴标签
        y_label_left = MathTex(r"W(\tau)", r",", r"V(\tau)", color=TEXT_COLOR).scale(0.35)
        y_label_left[0].set_color(HIGHLIGHT_COLOR)
        y_label_left[2].set_color(NEGATIVE_COLOR)
        y_label_left.next_to(axes_left.y_axis, UP, buff=0.1)

        y_label_right = MathTex(r"W(\tau)", r",", r"V(\tau)", color=TEXT_COLOR).scale(0.35)
        y_label_right[0].set_color(HIGHLIGHT_COLOR)
        y_label_right[2].set_color(NEGATIVE_COLOR)
        y_label_right.next_to(axes_right.y_axis, UP, buff=0.1)

        tau_left = MathTex(r"\tau", color=TEXT_COLOR).scale(0.4)
        tau_left.next_to(axes_left.x_axis, RIGHT, buff=0.1)
        tau_right = MathTex(r"\tau", color=TEXT_COLOR).scale(0.4)
        tau_right.next_to(axes_right.x_axis, RIGHT, buff=0.1)

        self.play(
            Create(axes_left), Create(axes_right),
            Write(left_title), Write(right_title),
            Write(y_label_left), Write(y_label_right),
            Write(tau_left), Write(tau_right)
        )

        # === W(τ) 权重函数（虚线）- 基于 SVG 路径 ===
        # SVG: M 65 85 C 75 185 130 225 325 232
        # 转换：从 (0, 0.97) 到 (5.3, 0.05) 的双曲衰减
        def w_func(x):
            return 0.95 / (1 + 1.8 * x)

        w_curve_left = DashedVMobject(
            axes_left.plot(w_func, x_range=[0.05, 5.3], color=HIGHLIGHT_COLOR),
            num_dashes=25
        )
        w_curve_right = DashedVMobject(
            axes_right.plot(w_func, x_range=[0.05, 5.3], color=HIGHLIGHT_COLOR),
            num_dashes=25
        )

        w_label_left = MathTex(r"W(\tau)", color=HIGHLIGHT_COLOR).scale(0.45)
        w_label_left.move_to(axes_left.c2p(1.2, 0.7))
        w_label_right = MathTex(r"W(\tau)", color=HIGHLIGHT_COLOR).scale(0.45)
        w_label_right.move_to(axes_right.c2p(1.5, 0.75))

        self.play(
            Create(w_curve_left), Create(w_curve_right),
            Write(w_label_left), Write(w_label_right)
        )
        self.wait(0.5)

        # === V(τ) 价值函数（实线）===

        # 学习：先苦后甜（基于 SVG：M 60 375 C 68 310 ... 325 235）
        # 从 y=375(负) 到 y=240(零) 再到 y=175(正) 最后到 y=235(接近零)
        def v_study(x):
            # 先负（近期痛苦）后正（远期收益）再衰减
            return -0.7 * np.exp(-1.5 * x) + 0.5 * (1 - np.exp(-0.8 * x)) * np.exp(-0.2 * x)

        # 玩手机：先甜后苦（基于 SVG：M 60 95 C 70 185 ... 325 246）
        # 从 y=95(正) 到 y=240(零) 再到 y=330(负) 最后到 y=246(接近零)
        def v_phone(x):
            # 先正（即时满足）后负（空虚）
            return 0.9 * np.exp(-1.2 * x) - 0.45 * (1 - np.exp(-0.4 * x))

        v_curve_left = axes_left.plot(v_study, x_range=[0.05, 5.3], color=NEGATIVE_COLOR, stroke_width=3)
        v_curve_right = axes_right.plot(v_phone, x_range=[0.05, 5.3], color=NEGATIVE_COLOR, stroke_width=3)

        v_label_left = MathTex(r"V(\tau)", color=NEGATIVE_COLOR).scale(0.45)
        v_label_left.move_to(axes_left.c2p(2.8, 0.35))
        v_label_right = MathTex(r"V(\tau)", color=NEGATIVE_COLOR).scale(0.45)
        v_label_right.move_to(axes_right.c2p(3.5, -0.35))

        self.play(
            Create(v_curve_left), Create(v_curve_right),
            Write(v_label_left), Write(v_label_right)
        )
        self.wait(0.5)

        # === 填充积分区域 ===
        # 学习：负面积（红）+ 正面积（绿）
        # 分段填充

        # 找到零点
        study_zero = 0.5  # 大约
        phone_zero = 0.65  # 大约

        # 学习的负面积区域（红色）
        area_study_neg = axes_left.get_area(
            v_curve_left,
            x_range=[0.05, study_zero],
            color=NEGATIVE_COLOR,
            opacity=0.4
        )
        # 学习的正面积区域（绿色）
        area_study_pos = axes_left.get_area(
            v_curve_left,
            x_range=[study_zero, 5.3],
            color=POSITIVE_COLOR,
            opacity=0.5
        )

        # 玩手机的正面积区域（绿色）
        area_phone_pos = axes_right.get_area(
            v_curve_right,
            x_range=[0.05, phone_zero],
            color=POSITIVE_COLOR,
            opacity=0.5
        )
        # 玩手机的负面积区域（红色）
        area_phone_neg = axes_right.get_area(
            v_curve_right,
            x_range=[phone_zero, 5.3],
            color=NEGATIVE_COLOR,
            opacity=0.4
        )

        self.play(
            FadeIn(area_study_neg), FadeIn(area_study_pos),
            FadeIn(area_phone_pos), FadeIn(area_phone_neg)
        )
        self.wait(0.5)

        # === 标记（X 和 ✓）===
        x_mark = VGroup(
            Line(UL * 0.3, DR * 0.3, color=NEGATIVE_COLOR, stroke_width=8),
            Line(UR * 0.3, DL * 0.3, color=NEGATIVE_COLOR, stroke_width=8)
        )
        x_mark.move_to(left_border.get_corner(UR) + LEFT * 0.5 + DOWN * 0.5)

        check_mark = VMobject(color=POSITIVE_COLOR, stroke_width=8)
        check_mark.set_points_as_corners([
            LEFT * 0.2 + DOWN * 0.1,
            ORIGIN + DOWN * 0.3,
            RIGHT * 0.3 + UP * 0.3
        ])
        check_mark.move_to(right_border.get_corner(UR) + LEFT * 0.5 + DOWN * 0.5)

        self.play(
            Create(left_border), Create(right_border),
            Create(x_mark), Create(check_mark)
        )
        self.wait(1)

        # 底部公式框
        formula_bottom = MathTex(
            r"I = \int_0^{+\infty}", r"W(\tau)", r"\cdot", r"V(\tau)", r"\, d\tau",
            color=TEXT_COLOR
        ).scale(0.55)
        formula_bottom[1].set_color(HIGHLIGHT_COLOR)
        formula_bottom[3].set_color(NEGATIVE_COLOR)
        formula_bottom.to_edge(DOWN, buff=0.4)

        formula_box = SurroundingRectangle(formula_bottom, color=TEXT_COLOR, buff=0.15, stroke_width=1)

        self.play(Write(formula_bottom), Create(formula_box))
        self.wait(1)

        # 解释文字
        explain = Text(
            "由于 W(τ) 在近期权重高，玩手机的近期正收益被放大 → 玩手机胜出",
            font=CHINESE_FONT,
            color=YELLOW_COLOR
        ).scale(0.38)
        explain.next_to(formula_box, UP, buff=0.25)
        self.play(Write(explain))
        self.wait(2.5)

        # 清理
        self.play(*[FadeOut(mob) for mob in self.mobjects])

    def show_exam_scenario(self):
        """考前场景：V(τ) 曲线变化"""
        section_title = Text(
            "考前场景：曲线翻转",
            font=CHINESE_FONT,
            color=ORANGE_COLOR
        ).scale(0.6)
        section_title.to_edge(UP, buff=0.5)
        self.play(Write(section_title))

        axes_config = {
            "x_range": [0, 5.5, 1],
            "y_range": [-1.0, 1.0, 0.5],
            "x_length": 4,
            "y_length": 3,
            "axis_config": {"color": TEXT_COLOR, "include_tip": True, "tip_length": 0.15},
        }

        axes_left = Axes(**axes_config).scale(0.6)
        axes_left.shift(LEFT * 3.2 + DOWN * 0.3)
        axes_right = Axes(**axes_config).scale(0.6)
        axes_right.shift(RIGHT * 3.2 + DOWN * 0.3)

        left_title = Text("去学习(考前)", font=CHINESE_FONT, color=POSITIVE_COLOR).scale(0.45)
        left_title.next_to(axes_left, UP, buff=0.2)
        right_title = Text("玩手机(考前)", font=CHINESE_FONT, color=NEGATIVE_COLOR).scale(0.45)
        right_title.next_to(axes_right, UP, buff=0.2)

        left_border = SurroundingRectangle(
            VGroup(axes_left, left_title),
            color=POSITIVE_COLOR, buff=0.15, stroke_width=3
        )
        right_border = SurroundingRectangle(
            VGroup(axes_right, right_title),
            color=NEGATIVE_COLOR, buff=0.15, stroke_width=3
        )

        self.play(
            Create(axes_left), Create(axes_right),
            Write(left_title), Write(right_title)
        )

        def w_func(x):
            return 0.95 / (1 + 1.8 * x)

        w_left = DashedVMobject(axes_left.plot(w_func, x_range=[0.05, 5.3], color=HIGHLIGHT_COLOR), num_dashes=20)
        w_right = DashedVMobject(axes_right.plot(w_func, x_range=[0.05, 5.3], color=HIGHLIGHT_COLOR), num_dashes=20)

        # 考前学习：收益提前到来
        def v_study_exam(x):
            return 0.8 * (1 - np.exp(-2.0 * x)) * np.exp(-0.4 * x)

        # 考前玩手机：焦虑加剧
        def v_phone_exam(x):
            return 0.4 * np.exp(-1.5 * x) - 0.7 * (1 - np.exp(-0.5 * x))

        v_left = axes_left.plot(v_study_exam, x_range=[0.05, 5.3], color=NEGATIVE_COLOR, stroke_width=3)
        v_right = axes_right.plot(v_phone_exam, x_range=[0.05, 5.3], color=NEGATIVE_COLOR, stroke_width=3)

        self.play(
            Create(w_left), Create(w_right),
            Create(v_left), Create(v_right)
        )

        area_left = axes_left.get_area(v_left, x_range=[0.05, 5.3], color=POSITIVE_COLOR, opacity=0.4)
        area_right = axes_right.get_area(v_right, x_range=[0.05, 5.3], color=NEGATIVE_COLOR, opacity=0.4)

        check_mark = VMobject(color=POSITIVE_COLOR, stroke_width=6)
        check_mark.set_points_as_corners([LEFT * 0.15 + DOWN * 0.08, ORIGIN + DOWN * 0.22, RIGHT * 0.22 + UP * 0.22])
        check_mark.move_to(left_border.get_corner(UR) + LEFT * 0.4 + DOWN * 0.4)

        x_mark = VGroup(
            Line(UL * 0.22, DR * 0.22, color=NEGATIVE_COLOR, stroke_width=6),
            Line(UR * 0.22, DL * 0.22, color=NEGATIVE_COLOR, stroke_width=6)
        )
        x_mark.move_to(right_border.get_corner(UR) + LEFT * 0.4 + DOWN * 0.4)

        self.play(FadeIn(area_left), FadeIn(area_right))
        self.play(
            Create(left_border), Create(right_border),
            Create(check_mark), Create(x_mark)
        )
        self.wait(1)

        explain = Text(
            "考试临近 → 学习的收益被「压缩」到近期 → 学习变得有吸引力",
            font=CHINESE_FONT,
            color=YELLOW_COLOR
        ).scale(0.4)
        explain.to_edge(DOWN, buff=0.5)
        self.play(Write(explain))
        self.wait(2)

        self.play(*[FadeOut(mob) for mob in self.mobjects])

    def show_conclusion(self):
        """展示结论"""
        conclusion = VGroup(
            Text("核心发现", font=CHINESE_FONT, color=HIGHLIGHT_COLOR).scale(0.6),
            Text("", font=CHINESE_FONT).scale(0.1),
            Text("1. 人类天生短视（W(τ) 双曲贴现）", font=CHINESE_FONT, color=TEXT_COLOR).scale(0.45),
            Text("2. 即时满足的近期正收益被放大", font=CHINESE_FONT, color=TEXT_COLOR).scale(0.45),
            Text("3. 延迟满足的近期负收益被放大", font=CHINESE_FONT, color=TEXT_COLOR).scale(0.45),
        ).arrange(DOWN, buff=0.25, aligned_edge=LEFT)

        self.play(FadeIn(conclusion))
        self.wait(2)

        solution_hint = Text(
            "解决方案：改变 V(τ) 的时间分布 → CTDP",
            font=CHINESE_FONT,
            color=YELLOW_COLOR
        ).scale(0.5)
        solution_hint.next_to(conclusion, DOWN, buff=0.5)
        self.play(Write(solution_hint))
        self.wait(2)

        self.play(FadeOut(conclusion), FadeOut(solution_hint))


class CTDPScene(Scene):
    """Scene 3: CTDP 链式时延协议 - 基于 SVG 精确复现"""

    def construct(self):
        title = Text(
            "CTDP 链式时延协议",
            font=CHINESE_FONT,
            color=HIGHLIGHT_COLOR
        ).scale(0.8)
        subtitle = Text(
            "Chained Time-Delay Protocol",
            font=CHINESE_FONT,
            color=TEXT_COLOR
        ).scale(0.4)
        title_group = VGroup(title, subtitle).arrange(DOWN, buff=0.2)
        title_group.to_edge(UP, buff=BUFF_MEDIUM)

        self.play(Write(title), FadeIn(subtitle))
        self.wait(1)

        # 三大原理
        self.show_sacred_seat_svg_style(title_group)
        self.show_linear_time_delay()
        self.show_video_addiction_trap_svg_style()
        self.show_precedent_principle()

    def show_sacred_seat_svg_style(self, title_group):
        """神圣座位原理 - 基于神圣座位.svg精确复现"""
        principle_title = Text(
            "原理一：神圣座位 (Sacred Seat)",
            font=CHINESE_FONT,
            color=POSITIVE_COLOR
        ).scale(0.55)
        principle_title.next_to(title_group, DOWN, buff=0.4)
        self.play(Write(principle_title))

        axes_config = {
            "x_range": [0, 5.5, 1],
            "y_range": [-1.2, 0.6, 0.5],
            "x_length": 4,
            "y_length": 2.8,
            "axis_config": {"color": TEXT_COLOR, "include_tip": True, "tip_length": 0.12},
        }

        axes_left = Axes(**axes_config).scale(0.55)
        axes_left.shift(LEFT * 3 + DOWN * 0.4)
        axes_right = Axes(**axes_config).scale(0.55)
        axes_right.shift(RIGHT * 3 + DOWN * 0.4)

        left_title = Text("放弃专注（正常情况）", font=CHINESE_FONT, color=TEXT_COLOR, weight=BOLD).scale(0.38)
        left_title.next_to(axes_left, UP, buff=0.2)
        right_title = Text("放弃专注（神圣座位）", font=CHINESE_FONT, color=TEXT_COLOR, weight=BOLD).scale(0.38)
        right_title.next_to(axes_right, UP, buff=0.2)

        # 红色边框（霓虹灯效果）
        left_border = SurroundingRectangle(
            VGroup(axes_left, left_title),
            color=NEGATIVE_COLOR, buff=0.12, stroke_width=3
        )
        right_border = SurroundingRectangle(
            VGroup(axes_right, right_title),
            color=NEGATIVE_COLOR, buff=0.12, stroke_width=3
        )

        self.play(
            Create(axes_left), Create(axes_right),
            Write(left_title), Write(right_title),
            Create(left_border), Create(right_border)
        )

        # 轴标签
        y_label_l = MathTex(r"W(\tau)", r",", r"V(\tau)", color=TEXT_COLOR).scale(0.28)
        y_label_l[0].set_color(HIGHLIGHT_COLOR)
        y_label_l[2].set_color(NEGATIVE_COLOR)
        y_label_l.next_to(axes_left.y_axis, UP, buff=0.08)

        y_label_r = MathTex(r"W(\tau)", r",", r"V(\tau)", color=TEXT_COLOR).scale(0.28)
        y_label_r[0].set_color(HIGHLIGHT_COLOR)
        y_label_r[2].set_color(NEGATIVE_COLOR)
        y_label_r.next_to(axes_right.y_axis, UP, buff=0.08)

        tau_l = MathTex(r"\tau", color=TEXT_COLOR).scale(0.32)
        tau_l.next_to(axes_left.x_axis, RIGHT, buff=0.08)
        tau_r = MathTex(r"\tau", color=TEXT_COLOR).scale(0.32)
        tau_r.next_to(axes_right.x_axis, RIGHT, buff=0.08)

        self.play(Write(y_label_l), Write(y_label_r), Write(tau_l), Write(tau_r))

        # W(τ) 函数
        def w_func(x):
            return 0.5 / (1 + 1.5 * x)

        w_left = DashedVMobject(
            axes_left.plot(w_func, x_range=[0.05, 5.3], color=HIGHLIGHT_COLOR),
            num_dashes=18
        )
        w_right = DashedVMobject(
            axes_right.plot(w_func, x_range=[0.05, 5.3], color=HIGHLIGHT_COLOR),
            num_dashes=18
        )

        w_label_l = MathTex(r"W(\tau)", color=HIGHLIGHT_COLOR).scale(0.32)
        w_label_l.move_to(axes_left.c2p(1.5, 0.4))
        w_label_r = MathTex(r"W(\tau)", color=HIGHLIGHT_COLOR).scale(0.32)
        w_label_r.move_to(axes_right.c2p(1.5, 0.35))

        self.play(Create(w_left), Create(w_right), Write(w_label_l), Write(w_label_r))

        # 正常情况 V(τ)：先甜后苦（SVG: M 60 95 C ... 325 246）
        def v_normal(x):
            return 0.5 * np.exp(-1.0 * x) - 0.4 * (1 - np.exp(-0.4 * x))

        # 神圣座位 V'(τ)：尖锐的负值脉冲（SVG: M 60 120 L 62 240 C ... 325 242）
        def v_sacred(x):
            # 先有一个小正值，然后急剧下降到负值，再回升
            return 0.3 * np.exp(-5.0 * x) - 1.1 * np.exp(-1.5 * x) * (1 - np.exp(-3.0 * x))

        v_left = axes_left.plot(v_normal, x_range=[0.05, 5.3], color=NEGATIVE_COLOR, stroke_width=2.5)
        v_right = axes_right.plot(v_sacred, x_range=[0.05, 5.3], color=NEGATIVE_COLOR, stroke_width=2.5)

        v_label_l = MathTex(r"V(\tau)", color=NEGATIVE_COLOR).scale(0.32)
        v_label_l.move_to(axes_left.c2p(3.5, -0.35))
        v_label_r = MathTex(r"V'(\tau)", color=NEGATIVE_COLOR).scale(0.32)
        v_label_r.move_to(axes_right.c2p(2.5, -0.7))

        self.play(Create(v_left), Create(v_right), Write(v_label_l), Write(v_label_r))

        # 填充区域
        zero_normal = 0.8
        area_left_pos = axes_left.get_area(v_left, x_range=[0.05, zero_normal], color=POSITIVE_COLOR, opacity=0.4)
        area_left_neg = axes_left.get_area(v_left, x_range=[zero_normal, 5.3], color=NEGATIVE_COLOR, opacity=0.4)

        # 神圣座位主要是负面积
        zero_sacred = 0.15
        area_right_pos = axes_right.get_area(v_right, x_range=[0.05, zero_sacred], color=POSITIVE_COLOR, opacity=0.3)
        area_right_neg = axes_right.get_area(v_right, x_range=[zero_sacred, 5.3], color=NEGATIVE_COLOR, opacity=0.5)

        self.play(
            FadeIn(area_left_pos), FadeIn(area_left_neg),
            FadeIn(area_right_pos), FadeIn(area_right_neg)
        )

        # 中间箭头
        arrow = Arrow(
            axes_left.get_right() + RIGHT * 0.15,
            axes_right.get_left() + LEFT * 0.15,
            color=TEXT_COLOR,
            stroke_width=3
        )
        self.play(Create(arrow))

        # 右图红色左箭头（表示压缩）
        compress_arrow = Arrow(
            axes_right.c2p(4.5, -0.15),
            axes_right.c2p(2.5, -0.15),
            color=NEGATIVE_COLOR,
            stroke_width=4,
            max_tip_length_to_length_ratio=0.2
        )
        self.play(Create(compress_arrow))

        # 解释
        explain = VGroup(
            Text("神圣座位机制：", font=CHINESE_FONT, color=YELLOW_COLOR).scale(0.38),
            Text("将「放弃」的代价压缩到近期 (V' 更陡峭)", font=CHINESE_FONT, color=TEXT_COLOR).scale(0.32),
            Text("W(τ) 在近期权重高 → 放弃的代价被大幅放大", font=CHINESE_FONT, color=TEXT_COLOR).scale(0.32),
        ).arrange(DOWN, buff=0.08, aligned_edge=LEFT)
        explain.to_edge(DOWN, buff=0.35)
        self.play(FadeIn(explain))
        self.wait(2.5)

        self.play(*[FadeOut(mob) for mob in self.mobjects])

    def show_linear_time_delay(self):
        """线性时延原理"""
        principle_title = Text(
            "原理二：线性时延 (Linear Time-Delay)",
            font=CHINESE_FONT,
            color=PURPLE_COLOR
        ).scale(0.55)
        principle_title.to_edge(UP, buff=0.5)
        self.play(Write(principle_title))

        axes_config = {
            "x_range": [0, 5.5, 1],
            "y_range": [-0.6, 1.0, 0.5],
            "x_length": 4.5,
            "y_length": 2.2,
            "axis_config": {"color": TEXT_COLOR, "include_tip": True, "tip_length": 0.12},
        }

        axes_top = Axes(**axes_config).scale(0.55)
        axes_top.shift(UP * 0.8 + RIGHT * 1.5)

        axes_bottom = Axes(**axes_config).scale(0.55)
        axes_bottom.shift(DOWN * 1.6 + RIGHT * 1.5)

        top_title = Text("现在开始学习", font=CHINESE_FONT, color=NEGATIVE_COLOR).scale(0.42)
        top_title.next_to(axes_top, UP, buff=0.12)

        bottom_title = Text("15分钟后开始学习", font=CHINESE_FONT, color=POSITIVE_COLOR).scale(0.42)
        bottom_title.next_to(axes_bottom, UP, buff=0.12)

        reject_icon = Text("😒", font="Segoe UI Emoji").scale(1.0)
        reject_icon.shift(LEFT * 3.5 + UP * 0.8)
        accept_icon = Text("😊", font="Segoe UI Emoji").scale(1.0)
        accept_icon.shift(LEFT * 3.5 + DOWN * 1.6)

        self.play(
            Create(axes_top), Create(axes_bottom),
            Write(top_title), Write(bottom_title),
            FadeIn(reject_icon), FadeIn(accept_icon)
        )

        def w_func(x):
            return 0.8 / (1 + 1.5 * x)

        w_top = DashedVMobject(axes_top.plot(w_func, x_range=[0.05, 5.3], color=HIGHLIGHT_COLOR), num_dashes=18)
        w_bottom = DashedVMobject(axes_bottom.plot(w_func, x_range=[0.05, 5.3], color=HIGHLIGHT_COLOR), num_dashes=18)

        def v_study(x):
            return -0.4 * np.exp(-1.2 * x) + 0.7 * (1 - np.exp(-0.6 * x)) * np.exp(-0.18 * x)

        delta_tau = 1.2

        def v_study_delayed(x):
            if x < delta_tau:
                return 0
            return v_study(x - delta_tau)

        v_top = axes_top.plot(v_study, x_range=[0.05, 5.3], color=NEGATIVE_COLOR, stroke_width=2.5)
        v_bottom = axes_bottom.plot(v_study_delayed, x_range=[0.05, 5.3], color=NEGATIVE_COLOR, stroke_width=2.5)

        w_label_t = MathTex(r"W(\tau)", color=HIGHLIGHT_COLOR).scale(0.32)
        w_label_t.move_to(axes_top.c2p(0.8, 0.7))
        w_label_b = MathTex(r"W(\tau)", color=HIGHLIGHT_COLOR).scale(0.32)
        w_label_b.move_to(axes_bottom.c2p(0.8, 0.7))

        v_label_t = MathTex(r"V(\tau)", color=NEGATIVE_COLOR).scale(0.32)
        v_label_t.move_to(axes_top.c2p(3.5, 0.5))
        v_label_b = MathTex(r"V(\tau - \Delta\tau)", color=NEGATIVE_COLOR).scale(0.32)
        v_label_b.move_to(axes_bottom.c2p(4.2, 0.55))

        self.play(
            Create(w_top), Create(w_bottom),
            Write(w_label_t), Write(w_label_b)
        )
        self.play(
            Create(v_top), Create(v_bottom),
            Write(v_label_t), Write(v_label_b)
        )

        # 填充
        study_zero = 0.38
        area_top_neg = axes_top.get_area(v_top, x_range=[0.05, study_zero], color=NEGATIVE_COLOR, opacity=0.35)
        area_top_pos = axes_top.get_area(v_top, x_range=[study_zero, 5.3], color=POSITIVE_COLOR, opacity=0.35)
        area_bottom = axes_bottom.get_area(v_bottom, x_range=[delta_tau, 5.3], color=POSITIVE_COLOR, opacity=0.4)

        self.play(FadeIn(area_top_neg), FadeIn(area_top_pos), FadeIn(area_bottom))

        # Δτ 标注
        delta_arrow = Arrow(
            axes_bottom.c2p(0, -0.35),
            axes_bottom.c2p(delta_tau, -0.35),
            color=YELLOW_COLOR,
            stroke_width=2,
            buff=0,
            max_tip_length_to_length_ratio=0.15
        )
        delta_label = MathTex(r"\Delta\tau", color=YELLOW_COLOR).scale(0.38)
        delta_label.next_to(delta_arrow, DOWN, buff=0.08)

        self.play(Create(delta_arrow), Write(delta_label))
        self.wait(1)

        explain = VGroup(
            Text("线性时延机制：", font=CHINESE_FONT, color=YELLOW_COLOR).scale(0.38),
            Text("将任务开始时间推迟 Δτ", font=CHINESE_FONT, color=TEXT_COLOR).scale(0.32),
            Text("→ 负值区域被推到 W(τ) 低权重区", font=CHINESE_FONT, color=TEXT_COLOR).scale(0.32),
            Text("→ 任务变得更容易接受", font=CHINESE_FONT, color=TEXT_COLOR).scale(0.32),
        ).arrange(DOWN, buff=0.06, aligned_edge=LEFT)
        explain.shift(LEFT * 3.5 + DOWN * 0.2)
        self.play(FadeIn(explain))
        self.wait(2.5)

        self.play(*[FadeOut(mob) for mob in self.mobjects])

    def show_video_addiction_trap_svg_style(self):
        """短视频时间陷阱 - 基于 timeline.svg 精确复现"""
        principle_title = Text(
            "短视频时间陷阱",
            font=CHINESE_FONT,
            color=NEGATIVE_COLOR
        ).scale(0.55)
        principle_title.to_edge(UP, buff=0.5)
        self.play(Write(principle_title))

        # 时间线
        timeline = Line(LEFT * 6, RIGHT * 6, color=TEXT_COLOR, stroke_width=1.5)
        timeline.shift(DOWN * 2.5)

        # 时间点及箭头
        arrow_tip = Triangle(fill_opacity=1, color=TEXT_COLOR).scale(0.1)
        arrow_tip.rotate(-PI / 2)
        arrow_tip.next_to(timeline, RIGHT, buff=0)

        time_labels = VGroup()
        times = ["19:00", "19:30", "20:00", "20:30"]
        positions = [-4.2, -1.4, 1.4, 4.2]

        for t, p in zip(times, positions):
            tick = Line(UP * 0.1, DOWN * 0.1, color=TEXT_COLOR, stroke_width=1)
            tick.move_to(timeline.get_start() + RIGHT * (p + 4.5))
            label = Text(t, font=CHINESE_FONT, color=TEXT_COLOR).scale(0.3)
            label.next_to(tick, DOWN, buff=0.15)
            time_labels.add(VGroup(tick, label))

        t_label = MathTex(r"t", color=TEXT_COLOR).scale(0.4)
        t_label.next_to(arrow_tip, RIGHT, buff=0.1)

        self.play(Create(timeline), Create(arrow_tip), FadeIn(time_labels), Write(t_label))

        # 创建小图表组件 - 精确复现 timeline.svg
        def create_mini_graph(is_play=True):
            """创建小型图表，绿框=短视频，红框=放下手机
            基于 SVG viewBox="0 0 120 150" 的精确比例
            """
            # 图表尺寸（基于 SVG 比例 120:150 = 0.8）
            graph_width = 1.4
            graph_height = 1.75

            # 白色背景
            bg = Rectangle(
                width=graph_width,
                height=graph_height,
                fill_color=WHITE,
                fill_opacity=1,
                stroke_width=0
            )

            # 边框颜色
            border_color = "#4DFF4D" if is_play else "#FF4D4D"
            border = Rectangle(
                width=graph_width,
                height=graph_height,
                color=border_color,
                stroke_width=2.5,
                fill_opacity=0
            )

            # 坐标系原点和范围（基于 SVG: Y轴x=20, X轴y=80, 图表区域约90x115）
            # 转换到 Manim 坐标：左下角为原点
            origin_x = -graph_width / 2 + 0.23  # SVG x=20 对应位置
            origin_y = -graph_height / 2 + 0.58  # SVG y=80 (从上往下) 转为零线位置

            # Y 轴（垂直线）- SVG: x1="20" y1="130" x2="20" y2="15"
            y_axis = Line(
                start=[origin_x, -graph_height / 2 + 0.12, 0],
                end=[origin_x, graph_height / 2 - 0.1, 0],
                color="#333333",
                stroke_width=1.2
            )

            # X 轴 / 零线（水平线）- SVG: x1="10" y1="80" x2="110" y2="80"
            x_axis = Line(
                start=[-graph_width / 2 + 0.1, origin_y, 0],
                end=[graph_width / 2 - 0.08, origin_y, 0],
                color="#333333",
                stroke_width=1.2
            )

            # W(τ) 曲线（蓝色虚线）- 双曲衰减
            # SVG: d="M 22 25 C 30 65 50 75 110 78"
            w_points = []
            for i in range(20):
                t = i / 19
                x = origin_x + 0.02 + t * (graph_width - 0.35)
                # 从高到低的双曲衰减
                y_val = 0.65 * (1 - t) ** 1.5 + origin_y + 0.02
                w_points.append([x, y_val, 0])

            w_curve_base = VMobject(color="#1060a0", stroke_width=1.5)
            w_curve_base.set_points_smoothly(w_points)
            w_curve = DashedVMobject(w_curve_base, num_dashes=12, dashed_ratio=0.5)

            # V(τ) 曲线（红色实线）和填充区域
            if is_play:
                # 玩手机：先正后负
                # SVG: d="M 20 30 C 25 65 30 75 35 80 C 45 100 60 120 85 110 C 105 100 110 85 115 82"
                v_points = []
                for i in range(25):
                    t = i / 24
                    x = origin_x + t * (graph_width - 0.3)
                    if t < 0.15:
                        # 初始正值区域，快速下降
                        y_val = origin_y + 0.6 * (1 - t / 0.15) ** 0.8
                    elif t < 0.3:
                        # 过渡到零
                        y_val = origin_y + 0.1 * (0.3 - t) / 0.15
                    else:
                        # 负值区域，逐渐恢复
                        progress = (t - 0.3) / 0.7
                        y_val = origin_y - 0.35 * np.sin(progress * np.pi * 0.8) * (1 - progress * 0.3)
                    v_points.append([x, y_val, 0])

                # 正值填充区域（绿色）- 从起点到零点
                pos_fill_points = v_points[:8] + [[v_points[7][0], origin_y, 0], [origin_x, origin_y, 0]]
                pos_fill = Polygon(
                    *[p[:2] + [0] for p in pos_fill_points],
                    fill_color="#b3dfb3",
                    fill_opacity=0.6,
                    stroke_width=0
                )

                # 负值填充区域（红色）- 从零点到终点
                neg_fill_points = [[v_points[7][0], origin_y, 0]] + v_points[7:] + [[v_points[-1][0], origin_y, 0]]
                neg_fill = Polygon(
                    *[p[:2] + [0] for p in neg_fill_points],
                    fill_color="#ffb3b3",
                    fill_opacity=0.5,
                    stroke_width=0
                )

                fill_areas = VGroup(pos_fill, neg_fill)

                # 勾号 ✓（绿色）
                check_size = 0.22
                mark = VMobject(color="#28a745", stroke_width=4)
                mark.set_points_as_corners([
                    [0, 0, 0],
                    [check_size * 0.4, -check_size * 0.4, 0],
                    [check_size, check_size * 0.5, 0]
                ])
                mark.move_to(border.get_corner(UR) + LEFT * 0.28 + DOWN * 0.28)

            else:
                # 放下手机：先负后正
                # SVG: d="M 20 130 C 25 100 30 85 35 80 C 45 65 60 55 85 60 C 105 65 110 75 115 78"
                v_points = []
                for i in range(25):
                    t = i / 24
                    x = origin_x + t * (graph_width - 0.3)
                    if t < 0.15:
                        # 初始负值区域
                        y_val = origin_y - 0.55 * (1 - t / 0.15) ** 0.8
                    elif t < 0.3:
                        # 过渡到零
                        y_val = origin_y - 0.08 * (0.3 - t) / 0.15
                    else:
                        # 正值区域
                        progress = (t - 0.3) / 0.7
                        y_val = origin_y + 0.3 * np.sin(progress * np.pi * 0.7) * (1 - progress * 0.4)
                    v_points.append([x, y_val, 0])

                # 负值填充区域（红色）- 从起点到零点
                neg_fill_points = v_points[:8] + [[v_points[7][0], origin_y, 0], [origin_x, origin_y, 0]]
                neg_fill = Polygon(
                    *[p[:2] + [0] for p in neg_fill_points],
                    fill_color="#ffb3b3",
                    fill_opacity=0.5,
                    stroke_width=0
                )

                # 正值填充区域（绿色）- 从零点到终点
                pos_fill_points = [[v_points[7][0], origin_y, 0]] + v_points[7:] + [[v_points[-1][0], origin_y, 0]]
                pos_fill = Polygon(
                    *[p[:2] + [0] for p in pos_fill_points],
                    fill_color="#b3dfb3",
                    fill_opacity=0.6,
                    stroke_width=0
                )

                fill_areas = VGroup(neg_fill, pos_fill)

                # 叉号 ✗（红色）
                cross_size = 0.18
                mark = VGroup(
                    Line(
                        [-cross_size, cross_size, 0],
                        [cross_size, -cross_size, 0],
                        color="#FF0000",
                        stroke_width=4
                    ),
                    Line(
                        [cross_size, cross_size, 0],
                        [-cross_size, -cross_size, 0],
                        color="#FF0000",
                        stroke_width=4
                    )
                )
                mark.move_to(border.get_corner(UR) + LEFT * 0.28 + DOWN * 0.28)

            # V(τ) 曲线
            v_curve = VMobject(color="#c00000", stroke_width=1.8)
            v_curve.set_points_smoothly(v_points)

            return VGroup(bg, fill_areas, y_axis, x_axis, w_curve, v_curve, border, mark)

        # 在每个时间点展示决策
        all_elements = VGroup()

        # 调整位置参数（图表更大了，需要更多间距）
        graph_positions = [-4.5, -1.5, 1.5, 4.5]
        upper_y = 0.6   # 绿框（短视频）Y 位置
        lower_y = -1.3  # 红框（放下手机）Y 位置

        for i, (t, p) in enumerate(zip(times, graph_positions)):
            # 短视频（上方，绿框）
            video_graph = create_mini_graph(is_play=True)
            video_graph.move_to([p, upper_y, 0])
            video_label = Text(f"短视频{chr(65 + i)}", font=CHINESE_FONT, color=TEXT_COLOR).scale(0.3)
            video_label.next_to(video_graph, UP, buff=0.1)

            # 放下手机（下方，红框）
            stop_graph = create_mini_graph(is_play=False)
            stop_graph.move_to([p, lower_y, 0])
            stop_label = Text("放下手机", font=CHINESE_FONT, color=TEXT_COLOR).scale(0.3)
            stop_label.next_to(stop_graph, DOWN, buff=0.1)

            group = VGroup(video_graph, video_label, stop_graph, stop_label)
            all_elements.add(group)

            self.play(FadeIn(group), run_time=0.5)

            # 箭头（主流程：实线；分支：虚线）
            if i < 3:
                next_p = graph_positions[i + 1]
                # 主流程箭头（绿框之间）
                main_arrow = Arrow(
                    [p + 0.8, upper_y, 0],
                    [next_p - 0.8, upper_y, 0],
                    color="#333333",
                    stroke_width=2,
                    buff=0,
                    max_tip_length_to_length_ratio=0.12
                )
                # 虚线分支（从主流程到红框）
                branch_start_x = p + 0.5
                branch_path = VMobject(color="#999999", stroke_width=1.5)
                branch_path.set_points_as_corners([
                    [branch_start_x, upper_y, 0],
                    [branch_start_x, lower_y, 0],
                    [next_p - 0.8, lower_y, 0]
                ])
                branch_dashed = DashedVMobject(branch_path, num_dashes=15, dashed_ratio=0.55)

                # 分支箭头头部
                branch_tip = Triangle(fill_opacity=1, color="#999999").scale(0.08)
                branch_tip.rotate(-PI / 2)
                branch_tip.move_to([next_p - 0.75, lower_y, 0])

                all_elements.add(main_arrow, branch_dashed, branch_tip)
                self.play(Create(main_arrow), Create(branch_dashed), FadeIn(branch_tip), run_time=0.4)

        # 省略号
        dots = Text("...", font=CHINESE_FONT, color=TEXT_COLOR, weight=BOLD).scale(0.7)
        dots.move_to([6.0, upper_y, 0])
        self.play(Write(dots))

        self.wait(1)

        explain = Text(
            "每一刻，短视频的即时满足都胜过「放下手机」的延迟收益",
            font=CHINESE_FONT,
            color=YELLOW_COLOR
        ).scale(0.38)
        explain.next_to(principle_title, DOWN, buff=0.4)
        self.play(Write(explain))
        self.wait(2)

        self.play(*[FadeOut(mob) for mob in self.mobjects])

    def show_precedent_principle(self):
        """下必为例原理"""
        principle_title = Text(
            "原理三：下必为例 (Precedent Principle)",
            font=CHINESE_FONT,
            color=ORANGE_COLOR
        ).scale(0.55)
        principle_title.to_edge(UP, buff=0.5)
        self.play(Write(principle_title))

        option1 = VGroup(
            RoundedRectangle(
                width=4, height=2,
                corner_radius=0.15,
                color=NEGATIVE_COLOR,
                fill_opacity=0.2
            ),
            Text("选项A：判定违规", font=CHINESE_FONT, color=NEGATIVE_COLOR).scale(0.45),
            Text("链条断裂，从零开始", font=CHINESE_FONT, color=TEXT_COLOR).scale(0.35),
        )
        option1[1].move_to(option1[0].get_top() + DOWN * 0.5)
        option1[2].move_to(option1[0].get_center() + DOWN * 0.3)
        option1.shift(LEFT * 3)

        option2 = VGroup(
            RoundedRectangle(
                width=4, height=2,
                corner_radius=0.15,
                color=POSITIVE_COLOR,
                fill_opacity=0.2
            ),
            Text("选项B：允许例外", font=CHINESE_FONT, color=POSITIVE_COLOR).scale(0.45),
            Text("但此后永久允许", font=CHINESE_FONT, color=TEXT_COLOR).scale(0.35),
        )
        option2[1].move_to(option2[0].get_top() + DOWN * 0.5)
        option2[2].move_to(option2[0].get_center() + DOWN * 0.3)
        option2.shift(RIGHT * 3)

        self.play(FadeIn(option1), FadeIn(option2))
        self.wait(1)

        conclusion = VGroup(
            Text("博弈论视角：", font=CHINESE_FONT, color=YELLOW_COLOR).scale(0.45),
            Text("现在的你 vs 未来的你", font=CHINESE_FONT, color=TEXT_COLOR).scale(0.4),
            Text("→ 跨越时间的纳什均衡", font=CHINESE_FONT, color=HIGHLIGHT_COLOR).scale(0.4),
        ).arrange(DOWN, buff=0.15)
        conclusion.next_to(VGroup(option1, option2), DOWN, buff=0.5)
        self.play(FadeIn(conclusion))
        self.wait(2)

        self.play(*[FadeOut(mob) for mob in self.mobjects])


class RSIPScene(Scene):
    """Scene 4: RSIP 递归稳态迭代协议"""

    def construct(self):
        title = Text(
            "RSIP 递归稳态迭代协议",
            font=CHINESE_FONT,
            color=PURPLE_COLOR
        ).scale(0.8)
        subtitle = Text(
            "Recursive Stabilization Iteration Protocol",
            font=CHINESE_FONT,
            color=TEXT_COLOR
        ).scale(0.4)
        title_group = VGroup(title, subtitle).arrange(DOWN, buff=0.2)
        title_group.to_edge(UP, buff=BUFF_MEDIUM)

        self.play(Write(title), FadeIn(subtitle))
        self.wait(1)

        self.show_steady_state()
        self.show_policy_tree()
        self.show_phase_evolution()

    def show_steady_state(self):
        """稳态概念"""
        concept_title = Text(
            "核心概念：稳态 (Steady State)",
            font=CHINESE_FONT,
            color=HIGHLIGHT_COLOR
        ).scale(0.55)
        concept_title.shift(UP * 1.5)
        self.play(Write(concept_title))

        states = VGroup()
        state_names = ["刷手机", "学习", "运动"]
        state_colors = [NEGATIVE_COLOR, POSITIVE_COLOR, HIGHLIGHT_COLOR]

        for name, color in zip(state_names, state_colors):
            rect = RoundedRectangle(
                width=1.8, height=0.8,
                corner_radius=0.1,
                color=color,
                fill_opacity=0.3
            )
            label = Text(name, font=CHINESE_FONT, color=color).scale(0.35)
            state = VGroup(rect, label)
            states.add(state)

        states.arrange(RIGHT, buff=0.5)
        states.next_to(concept_title, DOWN, buff=0.5)
        self.play(FadeIn(states))
        self.wait(0.5)

        explain = Text(
            "生活由大大小小的「稳态」组成，一旦进入就难以逃脱",
            font=CHINESE_FONT,
            color=TEXT_COLOR
        ).scale(0.4)
        explain.next_to(states, DOWN, buff=0.4)
        self.play(FadeIn(explain))
        self.wait(1.5)

        self.play(FadeOut(concept_title), FadeOut(states), FadeOut(explain))

    def show_policy_tree(self):
        """定式树"""
        tree_title = Text(
            "定式树（国策树）",
            font=CHINESE_FONT,
            color=ORANGE_COLOR
        ).scale(0.55)
        tree_title.shift(UP * 2)
        self.play(Write(tree_title))

        root = Circle(radius=0.2, color=PURPLE_COLOR, fill_opacity=0.5)
        root.shift(UP * 0.8)

        children = VGroup()
        for _ in range(3):
            child = Circle(radius=0.15, color=HIGHLIGHT_COLOR, fill_opacity=0.4)
            children.add(child)
        children.arrange(RIGHT, buff=0.8)
        children.next_to(root, DOWN, buff=0.5)

        lines = VGroup()
        for child in children:
            line = Line(root.get_bottom(), child.get_top(), color=TEXT_COLOR)
            lines.add(line)

        tree = VGroup(root, children, lines)
        self.play(FadeIn(tree))
        self.wait(0.5)

        explain = Text(
            "每个定式都是一个局部最优解，树形结构管理约束力",
            font=CHINESE_FONT,
            color=TEXT_COLOR
        ).scale(0.4)
        explain.next_to(tree, DOWN, buff=0.4)
        self.play(FadeIn(explain))
        self.wait(1.5)

        self.play(FadeOut(tree_title), FadeOut(tree), FadeOut(explain))

    def show_phase_evolution(self):
        """稳态迁移"""
        phase_title = Text(
            "稳态迁移",
            font=CHINESE_FONT,
            color=POSITIVE_COLOR
        ).scale(0.55)
        phase_title.shift(UP * 1.5)
        self.play(Write(phase_title))

        phases = VGroup()
        phase_data = [
            ("🌱 E0", "新建", "7天"),
            ("🌿 E1", "稳定", "21天"),
            ("🌳 E2", "内化", "习惯")
        ]

        for emoji_name, desc, duration in phase_data:
            phase_box = VGroup(
                Text(emoji_name, font="Segoe UI Emoji").scale(0.5),
                Text(desc, font=CHINESE_FONT, color=TEXT_COLOR).scale(0.35),
                Text(duration, font=CHINESE_FONT, color=HIGHLIGHT_COLOR).scale(0.3)
            ).arrange(DOWN, buff=0.1)
            phases.add(phase_box)

        phases.arrange(RIGHT, buff=1)
        phases.next_to(phase_title, DOWN, buff=0.5)

        arrows = VGroup()
        for i in range(len(phases) - 1):
            arrow = Arrow(
                phases[i].get_right(),
                phases[i + 1].get_left(),
                buff=0.15,
                color=POSITIVE_COLOR
            )
            arrows.add(arrow)

        self.play(FadeIn(phases[0]))
        self.play(Create(arrows[0]), FadeIn(phases[1]))
        self.play(Create(arrows[1]), FadeIn(phases[2]))
        self.wait(1.5)

        self.play(FadeOut(phase_title), FadeOut(phases), FadeOut(arrows))


class OutroScene(Scene):
    """Scene 5: Momentum 项目介绍 + 结语"""

    def construct(self):
        self.show_momentum()
        self.show_ending()

    def show_momentum(self):
        """Momentum 项目介绍"""
        logo = Text(
            "Momentum",
            font=CHINESE_FONT,
            color=HIGHLIGHT_COLOR
        ).scale(1)
        tagline = Text(
            "将 CTDP 和 RSIP 理论变为现实",
            font=CHINESE_FONT,
            color=TEXT_COLOR
        ).scale(0.45)
        logo_group = VGroup(logo, tagline).arrange(DOWN, buff=0.3)
        logo_group.shift(UP * 0.5)

        self.play(Write(logo), run_time=1)
        self.play(FadeIn(tagline))
        self.wait(1)

        features = VGroup(
            Text("✓ 任务链管理", font=CHINESE_FONT, color=POSITIVE_COLOR),
            Text("✓ 国策树系统", font=CHINESE_FONT, color=POSITIVE_COLOR),
            Text("✓ 稳态追踪", font=CHINESE_FONT, color=POSITIVE_COLOR),
        ).scale(0.4).arrange(DOWN, buff=0.2, aligned_edge=LEFT)
        features.next_to(logo_group, DOWN, buff=0.5)

        self.play(FadeIn(features))
        self.wait(1.5)

        self.play(FadeOut(logo_group), FadeOut(features))

    def show_ending(self):
        """结语"""
        summary = VGroup(
            Text("自制力问题 = 工程问题", font=CHINESE_FONT, color=HIGHLIGHT_COLOR),
            Text("CTDP：破解启动困难", font=CHINESE_FONT, color=POSITIVE_COLOR),
            Text("RSIP：实现稳态迁移", font=CHINESE_FONT, color=PURPLE_COLOR),
        ).scale(0.5).arrange(DOWN, buff=0.3)

        self.play(FadeIn(summary))
        self.wait(2)

        cta = Text(
            "开始你的自控之旅",
            font=CHINESE_FONT,
            color=YELLOW_COLOR
        ).scale(0.6)
        cta.next_to(summary, DOWN, buff=0.6)
        self.play(Write(cta))
        self.wait(2)

        self.play(FadeOut(summary), FadeOut(cta))
